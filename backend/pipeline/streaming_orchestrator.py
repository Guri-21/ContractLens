import asyncio
from dataclasses import dataclass
from math import ceil
import re
from typing import Any, Callable, Iterable

from app.analysis_jobs import AnalysisJobManager
from app.analysis_schemas import AnalysisJobState, AnalysisMode, ClauseWorkState
from .config import ModePolicy, get_mode_policy
from .step01_parse import iter_document_pages
from .step02_segment import ClauseSegmentationIterator
from .llm_client import complete_json
from .step03_classify import _classify_by_keywords, _normalise_label
from .step04_references import extract_references
from .step05_contradict import (
    _match_by_type,
    detect_contradictions,
    evaluate_contradiction_batch,
)
from .step06_refusal import apply_refusal
from .step07_playbook import validate_playbook
from .step08_risk import score_risk
from .step09_redline import generate_redlines
from .step10_report import generate_report


class ClauseBatchError(Exception):
    def __init__(self, failed_clause_ids: set[str]):
        super().__init__("Clause batch failed")
        self.failed_clause_ids = frozenset(failed_clause_ids)


@dataclass(frozen=True)
class PipelineStages:
    parse_pages: Callable[[str], Iterable[dict]]
    segment_factory: Callable[[dict], Any]
    classify_batch: Callable[[list[dict], ModePolicy], list[dict]]
    references: Callable[[list[dict]], list[dict]]
    refusal: Callable[[list[dict], list[str]], list[dict]]
    playbook: Callable[[list[dict], list[str]], list[dict]]
    contradictions: Callable[[list[dict], list[dict], ModePolicy], list[dict]]
    risk: Callable[[list[dict]], dict]
    redlines: Callable[[list[dict], list[dict]], list[dict]]
    verify_findings: Callable[[list[dict], list[dict]], list[dict]]
    report: Callable[[list[dict], list[dict], dict, list[str]], dict]


@dataclass
class _WorkLedger:
    total: int
    completed: int = 0


def _defaults() -> PipelineStages:
    return PipelineStages(
        iter_document_pages,
        lambda d: ClauseSegmentationIterator(d["id"], d["name"], d["type"]),
        _classify_with_policy,
        extract_references,
        apply_refusal,
        validate_playbook,
        _default_contradictions,
        score_risk,
        generate_redlines,
        _default_verify_findings,
        generate_report,
    )


def _default_contradictions(left, right, policy):
    return detect_contradictions(
        left,
        right,
        max_pairs=policy.maxContradictionPairs,
        batch_size=policy.contradictionBatchSize,
    )


class StreamingAnalysisOrchestrator:
    def __init__(self, manager: AnalysisJobManager, stages: PipelineStages | None = None):
        self.manager = manager
        self.uses_default_contradictions = stages is None
        self.stages = stages or _defaults()
        self.documents: dict[str, list[dict]] = {}
        self.work: dict[str, _WorkLedger] = {}

    async def extract(self, job_id: str, documents: list[dict]) -> None:
        self.documents[job_id] = [dict(document) for document in documents]
        await self.manager.publish(job_id, "job.state", {"state": "extracting"})
        try:
            for document in documents:
                if await self.manager.is_cancelled(job_id):
                    return
                await self._extract_document(job_id, document)
            if not await self.manager.is_cancelled(job_id):
                await self.manager.publish(
                    job_id, "job.state", {"state": "awaiting_analysis"}
                )
        except Exception as exc:
            await self._fail(job_id, "extraction_failed", exc)

    async def _extract_document(self, job_id: str, document: dict) -> None:
        segmenter = self.stages.segment_factory(document)
        completed = 0
        for page in self.stages.parse_pages(document["file_path"]):
            if await self.manager.is_cancelled(job_id):
                return
            await self._emit_clauses(job_id, segmenter.feed_page(page), document)
            completed += 1
            await self._progress(job_id, "extraction", "parse", completed, None)
        if not await self.manager.is_cancelled(job_id):
            await self._emit_clauses(job_id, segmenter.flush(), document)

    async def _emit_clauses(self, job_id: str, clauses, document: dict) -> None:
        for clause in clauses:
            clause = {
                "documentName": document["name"],
                "documentType": document["type"],
                **clause,
            }
            await self.manager.publish(job_id, "clause.extracted", {"clause": clause})

    async def analyze(self, job_id: str, mode: AnalysisMode, playbook_rules: list[str]) -> None:
        if await self.manager.is_cancelled(job_id):
            return
        await self.manager.publish(job_id, "job.state", {"state": "analyzing"})
        try:
            await self._analyze(job_id, get_mode_policy(mode), playbook_rules)
        except Exception as exc:
            await self._fail(job_id, "analysis_failed", exc)

    async def _analyze(self, job_id: str, policy: ModePolicy, rules: list[str]) -> None:
        snapshot = await self.manager.snapshot(job_id)
        source = [clause.model_dump() for clause in snapshot.clauses]
        clauses = await self._classify(job_id, source, policy)
        if await self.manager.is_cancelled(job_id):
            return
        clauses = self.stages.references(clauses)
        refusal, eligible = await self._refuse(job_id, clauses)
        self.work[job_id] = _WorkLedger(
            self._planned_units(source, eligible, policy)
        )
        await self._advance(job_id, "classification", len(source))
        await self._update_many(job_id, eligible, ClauseWorkState.CLASSIFIED)
        findings = await self._evaluate(
            job_id, clauses, eligible, refusal, policy, rules
        )
        if not await self.manager.is_cancelled(job_id):
            await self._finish(job_id, clauses, findings)

    async def _refuse(self, job_id: str, clauses: list[dict]):
        names = [d["name"] for d in self.documents.get(job_id, [])]
        refused = await self._publish_findings(
            job_id, self.stages.refusal(clauses, names), clauses
        )
        refused_ids = {finding["clauseId"] for finding in refused}
        eligible = [clause for clause in clauses if clause["id"] not in refused_ids]
        for clause in clauses:
            if clause["id"] in refused_ids:
                await self._update(job_id, clause, ClauseWorkState.NOT_EVALUATED)
        return refused, eligible

    def _planned_units(self, source, eligible, policy):
        playbook_batches = ceil(len(eligible) / policy.semanticRuleBatchSize)
        optional = 1 + int(policy.verifyHighRisk) + int(policy.autoRedlines)
        contradiction = int(bool(eligible))
        return len(source) + len(eligible) + playbook_batches + contradiction + optional

    async def _classify(self, job_id: str, clauses: list[dict], policy: ModePolicy):
        result = []
        for batch in _batches(clauses, policy.classificationBatchSize):
            if await self.manager.is_cancelled(job_id):
                break
            try:
                result.extend(self.stages.classify_batch(batch, policy))
            except ClauseBatchError as exc:
                failed = [c for c in batch if c["id"] in exc.failed_clause_ids]
                await self._failed_clauses(job_id, failed, exc)
                remaining = [c for c in batch if c["id"] not in exc.failed_clause_ids]
                if remaining:
                    try:
                        result.extend(self.stages.classify_batch(remaining, policy))
                    except Exception as retry_error:
                        await self._failed_clauses(job_id, remaining, retry_error)
            except Exception as exc:
                await self._failed_clauses(job_id, batch, exc)
        return result

    async def _failed_clauses(self, job_id: str, clauses: list[dict], error: Exception):
        for clause in clauses:
            await self._warning(job_id, "classification_failed", str(error), clause["id"])
            await self._update(job_id, clause, ClauseWorkState.NEEDS_RETRY)

    async def _evaluate(
        self, job_id: str, clauses: list[dict], eligible: list[dict],
        refused: list[dict], policy: ModePolicy, rules: list[str],
    ):
        await self._update_many(job_id, eligible, ClauseWorkState.CHECKING)
        dependent = []
        for batch in _batches(eligible, policy.semanticRuleBatchSize):
            if await self.manager.is_cancelled(job_id):
                return refused + dependent
            try:
                dependent.extend(self.stages.playbook(batch, rules))
            except Exception as exc:
                await self._stage_failure(job_id, "playbook", batch, exc)
            await self._advance(job_id, "playbook")
        left, right = _split_documents(eligible, self.documents.get(job_id, []))
        if await self.manager.is_cancelled(job_id):
            return refused + dependent
        try:
            dependent.extend(
                await self._contradictions(job_id, left, right, policy)
            )
        except Exception as exc:
            await self._stage_failure(job_id, "contradictions", eligible, exc)
        await self._advance(job_id, "contradictions")
        candidates = refused + dependent
        if policy.verifyHighRisk:
            if await self.manager.is_cancelled(job_id):
                return refused + dependent
            candidates = await self._verify(
                job_id, candidates, clauses, eligible, rules
            )
            await self._advance(job_id, "verification")
        if policy.autoRedlines:
            if await self.manager.is_cancelled(job_id):
                return candidates
            try:
                candidates = self.stages.redlines(candidates, clauses)
            except Exception as exc:
                await self._stage_failure(job_id, "redlines", eligible, exc)
            await self._advance(job_id, "redlines")
        published = await self._publish_findings(job_id, candidates[len(refused):], clauses)
        return refused + published

    async def _contradictions(self, job_id, left, right, policy):
        if not self.uses_default_contradictions:
            return self.stages.contradictions(left, right, policy)
        pairs = _match_by_type(left, right, policy.maxContradictionPairs)
        findings = []
        for batch in _batches(pairs, policy.contradictionBatchSize):
            if await self.manager.is_cancelled(job_id):
                break
            findings.extend(
                await asyncio.to_thread(evaluate_contradiction_batch, batch)
            )
        return findings

    async def _verify(self, job_id, findings, clauses, eligible, rules):
        try:
            verified = self.stages.verify_findings(findings, clauses)
            verified = _verify_high_risk_findings(verified, clauses, rules)
        except Exception as exc:
            await self._stage_failure(job_id, "verify_findings", eligible, exc)
            return [f for f in findings if f.get("status") == "not_evaluated"]
        verified_ids = {finding["id"] for finding in verified}
        rejected = [finding for finding in findings if finding["id"] not in verified_ids]
        if rejected:
            rejected_clauses = [
                clause for clause in eligible
                if clause["id"] in {finding["clauseId"] for finding in rejected}
            ]
            await self._stage_failure(
                job_id,
                "verify_findings",
                rejected_clauses,
                ValueError("Deterministic finding verification failed"),
            )
        return verified

    async def _publish_findings(self, job_id: str, findings: list[dict], clauses):
        valid = []
        for finding in findings:
            if not _exact_evidence(finding, clauses):
                await self._warning(
                    job_id, "evidence_not_exact",
                    "Finding evidence is not an exact source substring",
                    finding.get("clauseId"),
                )
                continue
            await self.manager.publish(job_id, "finding.created", {"finding": finding})
            valid.append(finding)
        return valid

    async def _finish(self, job_id: str, clauses: list[dict], findings: list[dict]):
        current = await self.manager.snapshot(job_id)
        finding_ids = {finding["clauseId"] for finding in findings}
        for clause in clauses:
            if current.clauseStates.get(clause["id"]) in {
                ClauseWorkState.NOT_EVALUATED,
                ClauseWorkState.NEEDS_RETRY,
            }:
                continue
            state = (ClauseWorkState.COMPLETED_WITH_FINDINGS
                     if clause["id"] in finding_ids else ClauseWorkState.COMPLETED)
            await self._update(job_id, clause, state)
        score = self.stages.risk(findings)
        if await self.manager.is_cancelled(job_id):
            return
        names = [d["name"] for d in self.documents.get(job_id, [])]
        try:
            report = self.stages.report(clauses, findings, score, names)
        except Exception as exc:
            await self._stage_failure(job_id, "report", clauses, exc)
            report = {"findings": findings, "status": "needs_retry"}
        await self._advance(job_id, "report")
        await self.manager.publish(job_id, "report.ready", {"report": report})
        current = await self.manager.snapshot(job_id)
        state = (AnalysisJobState.COMPLETED_WITH_WARNINGS if current.warnings
                 else AnalysisJobState.COMPLETED)
        result = {"clauses": clauses, "findings": findings,
                  "riskScore": score, "report": report}
        await self.manager.publish(
            job_id, "job.completed", {"state": state.value, "result": result}
        )

    async def _update_many(self, job_id: str, clauses: list[dict], state):
        for clause in clauses:
            await self._update(job_id, clause, state)
            if state == ClauseWorkState.CHECKING:
                await self._advance(job_id, state.value)

    async def _advance(self, job_id: str, stage: str, units: int = 1):
        ledger = self.work[job_id]
        ledger.completed = min(ledger.total, ledger.completed + units)
        await self._progress(
            job_id, "analysis", stage, ledger.completed, ledger.total
        )

    async def _stage_failure(self, job_id, stage, clauses, error):
        await self._warning(job_id, f"{stage}_failed", str(error))
        for clause in clauses:
            await self._update(job_id, clause, ClauseWorkState.NEEDS_RETRY)

    async def _update(self, job_id: str, clause: dict, state):
        await self.manager.publish(
            job_id, "clause.updated", {"clause": clause, "state": state.value}
        )

    async def _progress(self, job_id, phase, stage, completed, total):
        await self.manager.publish(job_id, "progress", {
            "phase": phase, "stage": stage, "completed": completed, "total": total,
        })

    async def _warning(self, job_id, code, message, clause_id=None):
        payload = {"code": code, "message": message}
        if clause_id:
            payload["clauseId"] = clause_id
        await self.manager.publish(job_id, "warning", payload)

    async def _fail(self, job_id: str, code: str, error: Exception):
        await self.manager.publish(
            job_id, "job.failed", {"code": code, "message": str(error)}
        )


def _batches(items: list[dict], size: int):
    for start in range(0, len(items), size):
        yield items[start:start + size]


def _classify_with_policy(clauses: list[dict], policy: ModePolicy) -> list[dict]:
    results = []
    for clause in clauses:
        clause_type = _classify_by_keywords(clause)
        if clause_type == "other" and policy.classifyOtherWithLlm:
            clause_type = _classify_other(clause, policy.maxRetries)
        results.append({**clause, "clauseType": clause_type})
    return results


def _classify_other(clause: dict, max_retries: int) -> str:
    prompt = (
        "Classify this legal clause. Return only JSON with a clauseType field.\n"
        f"Clause text:\n{clause.get('text', '')[:800]}"
    )
    for _attempt in range(max_retries + 1):
        try:
            data = complete_json(prompt, max_tokens=64)
            return _normalise_label(str(data.get("clauseType", "other")))
        except Exception:
            continue
    return "other"


def _default_verify_findings(findings: list[dict], clauses: list[dict]):
    return _verify_high_risk_findings(findings, clauses, [])


def _verify_high_risk_findings(findings, clauses, playbook_rules):
    verified = []
    source_rules = "\n".join(playbook_rules)
    for finding in findings:
        if finding.get("status") == "not_evaluated":
            verified.append(finding)
            continue
        if finding.get("riskLevel") not in {"high", "critical"}:
            verified.append(finding)
            continue
        if not _exact_evidence(finding, clauses):
            continue
        evidence_text = " ".join(
            item.get("quote", "") for item in finding.get("evidence", [])
        )
        claim_text = " ".join(
            filter(None, [finding.get("reason"), finding.get("playbookRuleViolated")])
        )
        if not _tokens_supported(claim_text, evidence_text):
            continue
        rule_ids = set(re.findall(r"\b[A-Z]{2,}-\d+\b", claim_text))
        if playbook_rules and rule_ids and any(
            rule_id not in source_rules for rule_id in rule_ids
        ):
            continue
        verified.append(finding)
    return verified


def _tokens_supported(claim_text: str, evidence_text: str) -> bool:
    patterns = (
        r"(?:[$€£]\s?\d[\d,]*(?:\.\d+)?)",
        r"\b\d{4}-\d{2}-\d{2}\b",
        r"\b\d{1,2}/\d{1,2}/\d{2,4}\b",
    )
    for pattern in patterns:
        for token in re.findall(pattern, claim_text):
            if token not in evidence_text:
                return False
    return True


def _split_documents(clauses: list[dict], documents: list[dict]):
    if len(documents) < 2:
        return clauses, []
    return (
        [c for c in clauses if c["documentId"] == documents[0]["id"]],
        [c for c in clauses if c["documentId"] == documents[1]["id"]],
    )


def _exact_evidence(finding: dict, clauses: list[dict]) -> bool:
    evidence = finding.get("evidence") or []
    return bool(evidence) and all(
        item.get("quote") and any(
            clause.get("documentName") == item.get("documentName")
            and item["quote"] in (clause.get("text") or "")
            for clause in clauses
        )
        for item in evidence
    )
