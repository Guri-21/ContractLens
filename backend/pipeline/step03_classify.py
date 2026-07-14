"""
Step 3 — Clause Classification
Labels each clause's type (payment, liability, IP, etc.)

SWAP: set env var CLAUSE_CLASSIFIER_BACKEND=claude to use Claude instead of HuggingFace.
      Set CLAUSE_CLASSIFIER_MODEL=<hf-model-id> to change the HF model.
"""
import json
import anthropic
import os
from .config import PIPELINE_CONFIG

_CLAUSE_TYPES = [
    "payment", "confidentiality", "SLA", "liability", "insurance",
    "warranty", "force_majeure", "IP", "termination", "penalty",
    "governing_law", "indemnification", "assignment", "dispute_resolution",
    "definitions", "scope_of_work", "other",
]


def classify_clauses(clauses: list[dict]) -> list[dict]:
    cfg = PIPELINE_CONFIG["clause_classifier"]
    if cfg["backend"] == "huggingface":
        return _classify_hf(clauses, cfg)
    return _classify_claude(clauses)


# ── HuggingFace backend ──────────────────────────────────────────

def _classify_hf(clauses: list[dict], cfg: dict) -> list[dict]:
    from transformers import pipeline as hf_pipeline
    # model loaded once; lazy import keeps startup fast when using Claude backend
    classifier = hf_pipeline(cfg["hf_task"], model=cfg["hf_model"])
    results = []
    for clause in clauses:
        pred = classifier(clause["text"][:512], top_k=cfg["top_k"])
        label = pred[0]["label"] if pred else "other"
        results.append({**clause, "clauseType": _normalise_label(label)})
    return results


def _normalise_label(raw: str) -> str:
    """Map HF model label to our canonical clauseType names."""
    raw = raw.lower().replace("-", "_").replace(" ", "_")
    for t in _CLAUSE_TYPES:
        if t in raw:
            return t
    return "other"


# ── Claude backend ───────────────────────────────────────────────

def _classify_claude(clauses: list[dict]) -> list[dict]:
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    results = []
    for clause in clauses:
        prompt = f"""Classify this legal clause into exactly one type.
Return ONLY a JSON object: {{"clauseType": "<type>"}}

Valid types: {", ".join(_CLAUSE_TYPES)}

Clause text:
\"\"\"{clause["text"][:800]}\"\"\"
"""
        resp = client.messages.create(
            model=PIPELINE_CONFIG["claude_model"],
            max_tokens=64,
            messages=[{"role": "user", "content": prompt}],
        )
        try:
            data = json.loads(resp.content[0].text)
            clause_type = data.get("clauseType", "other")
        except Exception:
            clause_type = "other"
        results.append({**clause, "clauseType": clause_type})
    return results
