import unittest
from dataclasses import replace

from app.analysis_jobs import AnalysisJobManager
from app.analysis_schemas import AnalysisJobState, AnalysisMode, ClauseWorkState
from pipeline.streaming_orchestrator import (
    ClauseBatchError,
    PipelineStages,
    StreamingAnalysisOrchestrator,
)
import pipeline.streaming_orchestrator as streaming


class FakeSegmenter:
    def feed_page(self, page):
        return page.get("clauses", [])

    def flush(self):
        return []


def fake_document():
    return {
        "id": "d1",
        "name": "MSA.txt",
        "type": "MSA",
        "file_path": "unused.txt",
    }


def fake_clause(clause_id, text):
    return {
        "id": clause_id,
        "documentId": "d1",
        "text": text,
        "references": [],
        "overrides": [],
    }


def finding(finding_id, clause_id="c1", quote="Pay in 30 days", **updates):
    value = {
        "id": finding_id,
        "clauseId": clause_id,
        "riskLevel": "high",
        "status": "evaluated",
        "reason": "Policy mismatch",
        "playbookRuleViolated": None,
        "evidence": [
            {
                "documentName": "MSA.txt",
                "page": 1,
                "section": None,
                "quote": quote,
            }
        ],
    }
    return {**value, **updates}


def fake_stages(
    *,
    classification_error_for=frozenset(),
    refusal_findings=None,
    playbook_findings=None,
    contradiction_findings=None,
    calls=None,
):
    calls = calls if calls is not None else []

    def classify_batch(clauses, policy):
        calls.append(("classify", [clause["id"] for clause in clauses]))
        failed = {
            clause["id"]
            for clause in clauses
            if clause["id"] in classification_error_for
        }
        if failed:
            raise ClauseBatchError(failed_clause_ids=failed)
        return [{**clause, "clauseType": "payment"} for clause in clauses]

    def refusal(clauses, names):
        calls.append(("refusal", [clause["id"] for clause in clauses]))
        return list(refusal_findings or [])

    def contradictions(left, right, policy):
        calls.append(
            ("contradictions", [clause["id"] for clause in left + right])
        )
        return list(contradiction_findings or [])

    def redlines(findings, clauses):
        calls.append(("redlines", len(findings)))
        return [{**item, "redline": {"originalText": "x", "suggestedText": "y"}} for item in findings]

    def verify_findings(findings, clauses):
        calls.append(("verify", len(findings)))
        return findings

    return PipelineStages(
        parse_pages=lambda _path: iter(
            [
                {
                    "page": 1,
                    "text": "",
                    "tables": [],
                    "clauses": [
                        fake_clause("c1", "Pay in 30 days"),
                        fake_clause("c2", "Exhibit B applies"),
                    ],
                }
            ]
        ),
        segment_factory=lambda _document: FakeSegmenter(),
        classify_batch=classify_batch,
        references=lambda clauses: clauses,
        refusal=refusal,
        playbook=lambda clauses, rules: list(playbook_findings or []),
        contradictions=contradictions,
        risk=lambda findings: {"overallScore": 0, "breakdown": {}},
        redlines=redlines,
        verify_findings=verify_findings,
        report=lambda clauses, findings, score, names: {"findings": findings},
    )


class StreamingOrchestratorTests(unittest.IsolatedAsyncioTestCase):
    async def make_job(self, stages):
        manager = AnalysisJobManager()
        job = await manager.create("u1", ["d1"], None, "IN")
        orchestrator = StreamingAnalysisOrchestrator(manager, stages=stages)
        return manager, job, orchestrator

    async def test_extraction_emits_each_clause_before_awaiting_analysis(self):
        manager, job, orchestrator = await self.make_job(fake_stages())

        await orchestrator.extract(job.id, [fake_document()])

        events = await manager.events_after(job.id, 0)
        types = [event.type for event in events]
        self.assertEqual(types.count("clause.extracted"), 2)
        self.assertEqual(types[-1], "job.state")
        self.assertEqual(events[-1].payload["state"], "awaiting_analysis")
        self.assertEqual(
            [clause.id for clause in (await manager.snapshot(job.id)).clauses],
            ["c1", "c2"],
        )

    async def test_cancellation_stops_new_pages_and_preserves_first_clause(self):
        manager = AnalysisJobManager()
        job = await manager.create("u1", ["d1"], None, "IN")

        class CancellingSegmenter(FakeSegmenter):
            def feed_page(self, page):
                if page["page"] == 1:
                    manager._jobs[job.id].cancelled = True
                return page["clauses"]

        stages = fake_stages()
        stages = PipelineStages(
            **{
                **stages.__dict__,
                "parse_pages": lambda _path: iter(
                    [
                        {"page": 1, "clauses": [fake_clause("c1", "First")]},
                        {"page": 2, "clauses": [fake_clause("c2", "Second")]},
                    ]
                ),
                "segment_factory": lambda _document: CancellingSegmenter(),
            }
        )
        orchestrator = StreamingAnalysisOrchestrator(manager, stages=stages)

        await orchestrator.extract(job.id, [fake_document()])

        snapshot = await manager.snapshot(job.id)
        self.assertEqual([clause.id for clause in snapshot.clauses], ["c1"])
        self.assertNotEqual(snapshot.state, AnalysisJobState.AWAITING_ANALYSIS)

    async def test_clause_failure_becomes_warning_not_clean_result(self):
        stages = fake_stages(classification_error_for={"c2"})
        manager, job, orchestrator = await self.make_job(stages)
        await orchestrator.extract(job.id, [fake_document()])

        await orchestrator.analyze(job.id, AnalysisMode.FAST, [])

        snapshot = await manager.snapshot(job.id)
        self.assertEqual(snapshot.state, AnalysisJobState.COMPLETED_WITH_WARNINGS)
        self.assertEqual(snapshot.clauseStates["c2"], ClauseWorkState.NEEDS_RETRY)
        self.assertEqual(snapshot.clauseStates["c1"], ClauseWorkState.COMPLETED)

    async def test_refusal_runs_before_and_excludes_dependent_reasoning(self):
        calls = []
        refused = finding(
            "refused",
            clause_id="c2",
            quote="Exhibit B applies",
            status="not_evaluated",
            missingDocuments=["Exhibit B"],
        )
        stages = fake_stages(refusal_findings=[refused], calls=calls)
        manager, job, orchestrator = await self.make_job(stages)
        await orchestrator.extract(job.id, [fake_document()])

        await orchestrator.analyze(job.id, AnalysisMode.FAST, [])

        refusal_index = next(i for i, call in enumerate(calls) if call[0] == "refusal")
        contradiction_index = next(
            i for i, call in enumerate(calls) if call[0] == "contradictions"
        )
        self.assertLess(refusal_index, contradiction_index)
        self.assertNotIn("c2", calls[contradiction_index][1])
        snapshot = await manager.snapshot(job.id)
        self.assertEqual(snapshot.clauseStates["c2"], ClauseWorkState.NOT_EVALUATED)

    async def test_non_exact_evidence_is_rejected_before_publication(self):
        invalid = finding("invented", quote="Payment is due tomorrow")
        stages = fake_stages(playbook_findings=[invalid])
        manager, job, orchestrator = await self.make_job(stages)
        await orchestrator.extract(job.id, [fake_document()])

        await orchestrator.analyze(job.id, AnalysisMode.FAST, ["payment rule"])

        snapshot = await manager.snapshot(job.id)
        self.assertEqual(snapshot.findings, [])
        self.assertEqual(snapshot.state, AnalysisJobState.COMPLETED_WITH_WARNINGS)
        self.assertIn("evidence_not_exact", [warning["code"] for warning in snapshot.warnings])

    async def test_only_deep_verifies_and_generates_redlines(self):
        for mode, expected in ((AnalysisMode.FAST, False), (AnalysisMode.DEEP, True)):
            with self.subTest(mode=mode):
                calls = []
                stages = fake_stages(
                    playbook_findings=[finding(f"finding-{mode.value}")], calls=calls
                )
                manager, job, orchestrator = await self.make_job(stages)
                await orchestrator.extract(job.id, [fake_document()])

                await orchestrator.analyze(job.id, mode, ["payment rule"])

                names = [call[0] for call in calls]
                self.assertEqual("verify" in names, expected)
                self.assertEqual("redlines" in names, expected)

    async def test_analysis_progress_uses_one_monotonic_counter_and_total(self):
        manager, job, orchestrator = await self.make_job(fake_stages())
        await orchestrator.extract(job.id, [fake_document()])

        await orchestrator.analyze(job.id, AnalysisMode.FAST, [])

        events = await manager.events_after(job.id, 0)
        progress = [
            event.payload
            for event in events
            if event.type == "progress" and event.payload["phase"] == "analysis"
        ]
        completed = [item["completed"] for item in progress]
        totals = {item["total"] for item in progress}
        self.assertEqual(completed, sorted(completed))
        self.assertEqual(len(totals), 1)
        self.assertEqual(completed[-1], totals.pop())

    def test_default_verifier_rejects_bad_quote_amount_date_and_rule_id(self):
        clause = {
            **fake_clause("c1", "PB-001 payment is $100 due on 2026-01-01"),
            "documentName": "MSA.txt",
            "documentType": "MSA",
        }
        good = finding(
            "good",
            quote=clause["text"],
            reason="PB-001 flags $100 due on 2026-01-01",
            playbookRuleViolated="PB-001",
        )
        bad = [
            finding("quote", quote="invented exact quote"),
            finding("amount", quote=clause["text"], reason="Amount is $900"),
            finding("date", quote=clause["text"], reason="Due on 2027-09-09"),
            finding(
                "rule",
                quote=clause["text"],
                reason="PB-999 violated",
                playbookRuleViolated="PB-999",
            ),
        ]

        verified = streaming._verify_high_risk_findings(
            [good, *bad], [clause], ["PB-001: payment rule"]
        )

        self.assertEqual([item["id"] for item in verified], ["good"])

    async def test_stage_errors_are_warnings_and_needs_retry_not_job_failure(self):
        for stage_name in ("playbook", "contradictions", "verify_findings", "redlines", "report"):
            with self.subTest(stage=stage_name):
                base = fake_stages(playbook_findings=[finding("f1")])

                def fail(*_args, **_kwargs):
                    raise RuntimeError(f"{stage_name} unavailable")

                stages = replace(base, **{stage_name: fail})
                manager, job, orchestrator = await self.make_job(stages)
                await orchestrator.extract(job.id, [fake_document()])

                await orchestrator.analyze(job.id, AnalysisMode.DEEP, ["payment rule"])

                snapshot = await manager.snapshot(job.id)
                self.assertEqual(
                    snapshot.state, AnalysisJobState.COMPLETED_WITH_WARNINGS
                )
                self.assertEqual(
                    snapshot.clauseStates["c1"], ClauseWorkState.NEEDS_RETRY
                )
                self.assertIn(
                    f"{stage_name}_failed",
                    [warning["code"] for warning in snapshot.warnings],
                )

    async def test_cancellation_gates_expensive_stages_and_each_batch(self):
        boundaries = {
            "contradictions": "playbook",
            "verify_findings": "contradictions",
            "redlines": "verify_findings",
            "report": "risk",
        }
        for blocked_stage, trigger_stage in boundaries.items():
            with self.subTest(blocked=blocked_stage):
                calls = []
                base = fake_stages(playbook_findings=[finding("f1")])
                manager, job, orchestrator = await self.make_job(base)

                def trigger(*args):
                    calls.append(trigger_stage)
                    manager._jobs[job.id].cancelled = True
                    if trigger_stage == "risk":
                        return {"overallScore": 0, "breakdown": {}}
                    if trigger_stage == "contradictions":
                        return []
                    if trigger_stage == "verify_findings":
                        return args[0]
                    return []

                def blocked(*_args):
                    calls.append(blocked_stage)
                    return []

                stages = replace(
                    base,
                    **{trigger_stage: trigger, blocked_stage: blocked},
                )
                orchestrator = StreamingAnalysisOrchestrator(manager, stages=stages)
                await orchestrator.extract(job.id, [fake_document()])

                await orchestrator.analyze(job.id, AnalysisMode.DEEP, ["payment rule"])

                self.assertNotIn(blocked_stage, calls)

        calls = []
        base = fake_stages()
        manager, job, _orchestrator = await self.make_job(base)

        def classify_and_cancel(clauses, policy):
            calls.append([clause["id"] for clause in clauses])
            manager._jobs[job.id].cancelled = True
            return [{**clause, "clauseType": "payment"} for clause in clauses]

        many_clauses = [fake_clause(f"c{index}", "Payment") for index in range(9)]
        tiny_batches = replace(
            base,
            parse_pages=lambda _path: iter(
                [{"page": 1, "clauses": many_clauses}]
            ),
            classify_batch=classify_and_cancel,
        )
        orchestrator = StreamingAnalysisOrchestrator(manager, stages=tiny_batches)
        await orchestrator.extract(job.id, [fake_document()])

        await orchestrator.analyze(job.id, AnalysisMode.FAST, [])

        self.assertEqual(calls, [[f"c{index}" for index in range(8)]])


if __name__ == "__main__":
    unittest.main()
