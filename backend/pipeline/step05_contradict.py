"""
Step 5 - Contradiction Detection.
Compares same-type clauses across two documents and flags conflicts.
"""

import uuid
from collections import defaultdict

from .config import PIPELINE_CONFIG
from .llm_client import complete_json

_COMPARABLE_TYPES = {
    "payment",
    "SLA",
    "liability",
    "insurance",
    "warranty",
    "IP",
    "termination",
    "penalty",
    "governing_law",
    "indemnification",
    "assignment",
    "dispute_resolution",
    "confidentiality",
}


def detect_contradictions(doc_a_clauses: list[dict], doc_b_clauses: list[dict]) -> list[dict]:
    cfg = PIPELINE_CONFIG["contradiction_detector"]
    findings = []
    for clause_a, clause_b in _match_by_type(doc_a_clauses, doc_b_clauses):
        if cfg["backend"] == "huggingface":
            result = _contradict_hf(clause_a, clause_b, cfg)
        else:
            result = _contradict_llm(clause_a, clause_b)
        if result:
            findings.append(result)
    return findings


def _contradict_hf(a: dict, b: dict, cfg: dict) -> dict | None:
    from transformers import pipeline as hf_pipeline

    nli = hf_pipeline(cfg["hf_task"], model=cfg["hf_model"])
    output = nli(
        sequences=a["text"][:400],
        candidate_labels=cfg["labels"],
        hypothesis_template="{}",
    )
    label_scores = dict(zip(output["labels"], output["scores"]))
    if label_scores.get("contradiction", 0) > 0.6:
        return _build_finding(a, b, "Conflicting terms detected by NLI model.")
    return None


def _contradict_llm(a: dict, b: dict) -> dict | None:
    prompt = f"""You are a legal contract reviewer checking for contradictions.

Document A clause ({a.get("documentName", "Doc A")}, section {a.get("sectionNumber", "?")}):
\"\"\"{a["text"][:500]}\"\"\"

Document B clause ({b.get("documentName", "Doc B")}, section {b.get("sectionNumber", "?")}):
\"\"\"{b["text"][:500]}\"\"\"

Do these clauses contradict each other?
Return ONLY JSON:
{{
  "contradicts": true,
  "reason": "<one sentence explanation>"
}}
Use false for "contradicts" if they are compatible or merely different.
"""
    try:
        data = complete_json(prompt, max_tokens=160)
        if data.get("contradicts"):
            return _build_finding(a, b, data.get("reason", "Contradiction detected."))
    except Exception:
        pass
    return None


def _match_by_type(doc_a: list[dict], doc_b: list[dict]) -> list[tuple[dict, dict]]:
    max_pairs = int(PIPELINE_CONFIG.get("max_contradiction_pairs", 30))
    by_type_b: dict[str, list[dict]] = defaultdict(list)
    for clause in doc_b:
        if clause.get("clauseType") in _COMPARABLE_TYPES:
            by_type_b[clause["clauseType"]].append(clause)

    pairs = []
    for clause in doc_a:
        clause_type = clause.get("clauseType")
        if clause_type in by_type_b:
            pairs.extend((clause, match) for match in by_type_b[clause_type])
        if len(pairs) >= max_pairs:
            return pairs[:max_pairs]
    return pairs


def _build_finding(a: dict, b: dict, reason: str) -> dict:
    return {
        "id": f"r_{uuid.uuid4().hex[:8]}",
        "clauseId": a["id"],
        "riskLevel": "high",
        "status": "evaluated",
        "reason": reason,
        "playbookRuleViolated": None,
        "evidence": [
            {
                "documentName": a.get("documentName", "Doc A"),
                "page": a.get("page"),
                "section": a.get("sectionNumber"),
                "quote": a["text"][:300],
            },
            {
                "documentName": b.get("documentName", "Doc B"),
                "page": b.get("page"),
                "section": b.get("sectionNumber"),
                "quote": b["text"][:300],
            },
        ],
        "missingDocuments": None,
        "redline": None,
    }
