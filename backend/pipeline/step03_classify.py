"""
Step 3 - Clause Classification.
Labels each clause's type: payment, liability, IP, SLA, and similar.
"""

from .config import PIPELINE_CONFIG
from .llm_client import complete_json, complete_json_batch

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


_BATCH_CLASSIFY_TEMPLATE = """You are a legal contract analysis engine.
Classify each clause below into exactly one type from this list:
{VALID_TYPES}

Input is a JSON array of objects with "id" and "text" fields.
Return ONLY a JSON object: {{"results": [{{"id": "<id>", "clauseType": "<type>"}}, ...]}}
One entry per input clause, same order, no extra fields.

Clauses:
{ITEMS}
"""


def _classify_llm(clauses: list[dict]) -> list[dict]:
    classify_other_with_llm = PIPELINE_CONFIG.get("classify_other_with_llm", False)
    valid_types = ", ".join(_CLAUSE_TYPES)

    # First pass: keyword-based (free, instant)
    keyword_classified: list[dict] = []
    needs_llm: list[dict] = []
    for clause in clauses:
        kw = _classify_by_keywords(clause)
        if kw != "other":
            keyword_classified.append({**clause, "clauseType": kw})
        else:
            needs_llm.append(clause)

    if not needs_llm or not classify_other_with_llm:
        return keyword_classified + [{**c, "clauseType": "other"} for c in needs_llm]

    # Second pass: single batch LLM call for all unresolved clauses
    batch_items = [{"id": c["id"], "text": c["text"][:600]} for c in needs_llm]
    template = _BATCH_CLASSIFY_TEMPLATE.replace("{VALID_TYPES}", valid_types)
    batch_results = complete_json_batch(batch_items, template, result_key="results", max_tokens=1024)

    # Build lookup from batch output
    type_by_id: dict[str, str] = {}
    for entry in batch_results:
        if isinstance(entry, dict) and "id" in entry:
            type_by_id[entry["id"]] = _normalise_label(str(entry.get("clauseType", "other")))

    llm_classified = [
        {**c, "clauseType": type_by_id.get(c["id"], "other")}
        for c in needs_llm
    ]

    # Merge preserving original order
    order = {c["id"]: i for i, c in enumerate(clauses)}
    all_classified = keyword_classified + llm_classified
    all_classified.sort(key=lambda c: order.get(c["id"], 9999))
    return all_classified


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
