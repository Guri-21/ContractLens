"""
Step 5 - Contradiction Detection.
Compares same-type clauses across two documents and flags conflicts.
"""

import uuid
from collections import defaultdict
from collections.abc import Callable

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


def detect_contradictions(
    doc_a_clauses: list[dict],
    doc_b_clauses: list[dict],
    max_pairs: int | None = None,
    batch_size: int = 1,
    should_cancel: Callable[[], bool] | None = None,
) -> list[dict]:
    if batch_size < 1:
        raise ValueError("batch_size must be at least 1")
    cfg = PIPELINE_CONFIG["contradiction_detector"]
    findings = []
    pairs = _match_by_type(doc_a_clauses, doc_b_clauses, max_pairs=max_pairs)
    for start in range(0, len(pairs), batch_size):
        if should_cancel and should_cancel():
            break
        batch = pairs[start : start + batch_size]
        findings.extend(evaluate_contradiction_batch(batch, cfg))
    return findings


def evaluate_contradiction_batch(
    pairs: list[tuple[dict, dict]], cfg: dict | None = None
) -> list[dict]:
    config = cfg or PIPELINE_CONFIG["contradiction_detector"]
    if config["backend"] != "huggingface":
        return _contradict_llm_batch(pairs)
    return [
        result
        for left, right in pairs
        if (result := _contradict_hf(left, right, config))
    ]


def _contradict_hf(a: dict, b: dict, cfg: dict) -> dict | None:
    from transformers import pipeline as hf_pipeline

    nli = hf_pipeline(cfg["hf_task"], model=cfg["hf_model"])
    output = nli(
        sequences=a["text"][:400],
        candidate_labels=cfg["labels"],
        hypothesis_template="{}",
    )
    label_scores = dict(zip(output["labels"], output["scores"]))
    contradiction_score = label_scores.get("contradiction", 0)
    if contradiction_score > 0.6:
        return _build_finding(a, b, "Conflicting terms detected by NLI model.", round(contradiction_score * 100, 2))
    return None


def _contradict_llm(a: dict, b: dict) -> dict | None:
    findings = _contradict_llm_batch([(a, b)])
    return findings[0] if findings else None


def _contradict_llm_batch(pairs: list[tuple[dict, dict]]) -> list[dict]:
    pair_text = "\n\n".join(
        f"PAIR {index}\nA: {left['text'][:500]}\nB: {right['text'][:500]}"
        for index, (left, right) in enumerate(pairs)
    )
    prompt = f"""You are a legal contract reviewer checking for contradictions.

{pair_text}

Return ONLY JSON:
{{
  "results": [
    {{
      "index": 0,
      "contradicts": true,
      "reason": "<one sentence>",
      "confidence": 95.5
    }}
  ]
}}
Use false for "contradicts" if they are compatible or merely different.
"""
    data = complete_json(prompt, max_tokens=max(160, 120 * len(pairs)))
    findings = []
    for result in data.get("results", []):
        index = result.get("index")
        if not isinstance(index, int) or not 0 <= index < len(pairs):
            continue
        if result.get("contradicts"):
            left, right = pairs[index]
            findings.append(
                _build_finding(
                    left,
                    right,
                    result.get("reason", "Contradiction detected."),
                    float(result.get("confidence", 90.0)),
                )
            )
    return findings


def _match_by_type(
    doc_a: list[dict],
    doc_b: list[dict],
    max_pairs: int | None = None,
) -> list[tuple[dict, dict]]:
    pair_limit = max_pairs or int(PIPELINE_CONFIG.get("max_contradiction_pairs", 30))
    by_type_b: dict[str, list[dict]] = defaultdict(list)
    for clause in doc_b:
        if clause.get("clauseType") in _COMPARABLE_TYPES:
            by_type_b[clause["clauseType"]].append(clause)

    pairs = []
    for clause in doc_a:
        clause_type = clause.get("clauseType")
        if clause_type in by_type_b:
            pairs.extend((clause, match) for match in by_type_b[clause_type])
        if len(pairs) >= pair_limit:
            return pairs[:pair_limit]
    return pairs


def _build_finding(a: dict, b: dict, reason: str, confidence: float) -> dict:
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
        "contradictionType": "msa_conflict",
        "confidence": confidence,
        "comparisonText": {
            "sowText": a["text"],
            "msaText": b["text"],
        }
    }
