"""
Step 5 — Contradiction Detection
Compares same-type clauses across two documents and flags conflicts.

SWAP: set env var CONTRADICTION_BACKEND=claude to use Claude instead of HuggingFace.
      Set CONTRADICTION_MODEL=<hf-model-id> to change the NLI model.
"""
import json
import uuid
import anthropic
import os
from .config import PIPELINE_CONFIG


def detect_contradictions(
    doc_a_clauses: list[dict],
    doc_b_clauses: list[dict],
) -> list[dict]:
    """
    Compares matching clauseType pairs across two documents.
    Returns RiskFindingDTO dicts for every detected contradiction.
    """
    cfg = PIPELINE_CONFIG["contradiction_detector"]
    findings = []
    pairs = _match_by_type(doc_a_clauses, doc_b_clauses)
    for a, b in pairs:
        if cfg["backend"] == "huggingface":
            result = _contradict_hf(a, b, cfg)
        else:
            result = _contradict_claude(a, b)
        if result:
            findings.append(result)
    return findings


# ── HuggingFace backend (ContractNLI-style NLI model) ───────────

def _contradict_hf(a: dict, b: dict, cfg: dict) -> dict | None:
    from transformers import pipeline as hf_pipeline
    nli = hf_pipeline(cfg["hf_task"], model=cfg["hf_model"])
    # premise = doc_a clause, hypothesis = doc_b clause
    output = nli(
        sequences=a["text"][:400],
        candidate_labels=cfg["labels"],
        hypothesis_template="{}",
    )
    # output["labels"] and output["scores"] are aligned lists
    label_scores = dict(zip(output["labels"], output["scores"]))
    if label_scores.get("contradiction", 0) > 0.6:
        return _build_finding(a, b, "Conflicting terms detected by NLI model.")
    return None


# ── Claude backend ───────────────────────────────────────────────

def _contradict_claude(a: dict, b: dict) -> dict | None:
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    prompt = f"""You are a legal contract reviewer checking for contradictions.

Document A clause ({a.get("documentName", "Doc A")}, section {a.get("sectionNumber", "?")}):
\"\"\"{a["text"][:500]}\"\"\"

Document B clause ({b.get("documentName", "Doc B")}, section {b.get("sectionNumber", "?")}):
\"\"\"{b["text"][:500]}\"\"\"

Do these clauses contradict each other?
Return ONLY JSON:
{{
  "contradicts": true | false,
  "reason": "<one sentence explanation>"
}}
"""
    resp = client.messages.create(
        model=PIPELINE_CONFIG["claude_model"],
        max_tokens=128,
        messages=[{"role": "user", "content": prompt}],
    )
    try:
        data = json.loads(resp.content[0].text)
        if data.get("contradicts"):
            return _build_finding(a, b, data.get("reason", "Contradiction detected."))
    except Exception:
        pass
    return None


# ── Helpers ──────────────────────────────────────────────────────

def _match_by_type(
    doc_a: list[dict], doc_b: list[dict]
) -> list[tuple[dict, dict]]:
    """Pair clauses with the same clauseType across documents."""
    from collections import defaultdict
    by_type_b: dict[str, list[dict]] = defaultdict(list)
    for c in doc_b:
        if c.get("clauseType"):
            by_type_b[c["clauseType"]].append(c)
    pairs = []
    for c in doc_a:
        ct = c.get("clauseType")
        if ct and ct in by_type_b:
            for match in by_type_b[ct]:
                pairs.append((c, match))
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
