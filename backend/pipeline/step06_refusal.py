"""
Step 6 — Refusal Engine (deterministic, NO LLM)
If a clause references a document that was NOT uploaded,
mark the finding as not_evaluated. Never let the LLM guess.
This is a hard requirement — do not remove this step.
"""
import re
import uuid

# Patterns that indicate a reference to an external document
_EXHIBIT_RE = re.compile(
    r"\b(Exhibit|Schedule|Annex|Appendix|Attachment)\s+([A-Z0-9]+)\b",
    re.IGNORECASE,
)


def apply_refusal(
    clauses: list[dict],
    uploaded_document_names: list[str],
) -> list[dict]:
    """
    Scans each clause for references to exhibits/schedules.
    If the referenced document is not in uploaded_document_names,
    returns a not_evaluated RiskFindingDTO for that clause.
    """
    uploaded_lower = {n.lower() for n in uploaded_document_names}
    findings = []
    for clause in clauses:
        missing = _find_missing(clause["text"], uploaded_lower)
        if missing:
            findings.append(_not_evaluated_finding(clause, missing))
    return findings


def _find_missing(text: str, uploaded_lower: set[str]) -> list[str]:
    missing = []
    for m in _EXHIBIT_RE.finditer(text):
        ref_label = f"{m.group(1)} {m.group(2)}"  # e.g. "Exhibit B"
        if ref_label.lower() not in uploaded_lower:
            missing.append(ref_label)
    return list(dict.fromkeys(missing))  # deduplicate, preserve order


def _not_evaluated_finding(clause: dict, missing_docs: list[str]) -> dict:
    return {
        "id": f"r_{uuid.uuid4().hex[:8]}",
        "clauseId": clause["id"],
        "riskLevel": "high",
        "status": "not_evaluated",
        "reason": (
            f"Cannot evaluate: clause references "
            f"{', '.join(missing_docs)} which {'was' if len(missing_docs) == 1 else 'were'} "
            f"not uploaded. AI will not guess the content of missing documents."
        ),
        "playbookRuleViolated": None,
        "evidence": [
            {
                "documentName": clause.get("documentName", ""),
                "page": clause.get("page"),
                "section": clause.get("sectionNumber"),
                "quote": clause["text"][:300],
            }
        ],
        "missingDocuments": missing_docs,
        "redline": None,
    }
