"""
Step 3 - Clause Classification.
Labels each clause's type: payment, liability, IP, SLA, and similar.
"""

from .config import PIPELINE_CONFIG
from .llm_client import complete_json

_CLAUSE_TYPES = [
    "payment",
    "confidentiality",
    "SLA",
    "liability",
    "insurance",
    "warranty",
    "force_majeure",
    "IP",
    "termination",
    "penalty",
    "governing_law",
    "indemnification",
    "assignment",
    "dispute_resolution",
    "definitions",
    "scope_of_work",
    "other",
]

_KEYWORD_RULES = [
    ("payment", ("payment", "pay ", "paid", "invoice", "invoices", "net ", "salary", "remuneration", "bonus", "fee", "fees")),
    ("confidentiality", ("confidential", "trade secret", "non-public", "disclose", "disclosure")),
    ("SLA", ("service level", "sla", "performance metric", "uptime", "response time")),
    ("liability", ("liability", "liable", "limitation of liability", "damages")),
    ("insurance", ("insurance", "insured", "coverage", "policy limits")),
    ("warranty", ("warrant", "warranty", "represents and warrants")),
    ("force_majeure", ("force majeure", "act of god", "beyond reasonable control")),
    ("IP", ("intellectual property", "copyright", "patent", "trademark", "iprs", "moral rights")),
    ("termination", ("terminate", "termination", "expires", "expiry", "notice period")),
    ("penalty", ("penalty", "liquidated damages", "termination fee")),
    ("governing_law", ("governing law", "laws of", "jurisdiction")),
    ("indemnification", ("indemnify", "indemnification", "hold harmless", "defend")),
    ("assignment", ("assign", "assignment", "change of control")),
    ("dispute_resolution", ("arbitration", "dispute", "venue", "court", "litigation")),
    ("definitions", ("means", "shall mean", "defined below", "definition")),
    ("scope_of_work", ("scope of work", "services", "deliverables", "duties", "job title")),
]


def classify_clauses(clauses: list[dict]) -> list[dict]:
    cfg = PIPELINE_CONFIG["clause_classifier"]
    if cfg["backend"] == "huggingface":
        return _classify_hf(clauses, cfg)
    return _classify_llm(clauses)


def _classify_hf(clauses: list[dict], cfg: dict) -> list[dict]:
    from transformers import pipeline as hf_pipeline

    classifier = hf_pipeline(cfg["hf_task"], model=cfg["hf_model"])
    results = []
    for clause in clauses:
        pred = classifier(clause["text"][:512], top_k=cfg["top_k"])
        label = pred[0]["label"] if pred else "other"
        results.append({**clause, "clauseType": _normalise_label(label)})
    return results


def _classify_llm(clauses: list[dict]) -> list[dict]:
    results = []
    valid_types = ", ".join(_CLAUSE_TYPES)
    classify_other_with_llm = PIPELINE_CONFIG.get("classify_other_with_llm", False)
    for clause in clauses:
        keyword_type = _classify_by_keywords(clause)
        if keyword_type != "other":
            results.append({**clause, "clauseType": keyword_type})
            continue
        if not classify_other_with_llm:
            results.append({**clause, "clauseType": "other"})
            continue

        prompt = f"""Classify this legal clause into exactly one type.
Return ONLY a JSON object: {{"clauseType": "<type>"}}

Valid types: {valid_types}

Clause text:
\"\"\"{clause["text"][:800]}\"\"\"
"""
        try:
            data = complete_json(prompt, max_tokens=64)
            clause_type = _normalise_label(str(data.get("clauseType", "other")))
        except Exception:
            clause_type = "other"
        results.append({**clause, "clauseType": clause_type})
    return results


def _classify_by_keywords(clause: dict) -> str:
    text = f"{clause.get('title') or ''} {clause.get('text') or ''}".lower()
    for clause_type, keywords in _KEYWORD_RULES:
        if any(keyword in text for keyword in keywords):
            return clause_type
    return "other"


def _normalise_label(raw: str) -> str:
    normalized = raw.lower().replace("-", "_").replace(" ", "_")
    aliases = {
        "service_level": "SLA",
        "service_level_agreement": "SLA",
        "sla": "SLA",
        "intellectual_property": "IP",
        "ip": "IP",
        "governing_law": "governing_law",
        "governing": "governing_law",
        "scope": "scope_of_work",
        "scope_of_services": "scope_of_work",
    }
    if normalized in aliases:
        return aliases[normalized]
    for clause_type in _CLAUSE_TYPES:
        if clause_type.lower() == normalized or clause_type.lower() in normalized:
            return clause_type
    return "other"
