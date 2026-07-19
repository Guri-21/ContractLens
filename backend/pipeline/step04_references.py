"""
Step 4 - Dependency / Reference Extraction.

Deterministically maps explicit section references to known clause IDs.
Also captures exhibit/schedule/annex references that point to external documents.
"""

import re

# Matches: "section 2.1", "clause 3.1(a)", "article 5", "§2.1", "§ 2.1(b)"
_SECTION_RE = re.compile(
    r"(?:"
    r"§\s*([0-9]{1,2}(?:\.[0-9]{1,2})*(?:\([a-z]\))?)"
    r"|(?:section|clause|article|paragraph)\s+([0-9]{1,2}(?:\.[0-9]{1,2})*(?:\([a-z]\))?)"
    r")",
    re.IGNORECASE,
)

# Matches: "Exhibit B", "Schedule A", "Annex 1", "Appendix C", "Attachment 2"
_EXHIBIT_RE = re.compile(
    r"\b(exhibit|schedule|annex|appendix|attachment)\s+([A-Z0-9]+)\b",
    re.IGNORECASE,
)

_OVERRIDE_PHRASES = ("notwithstanding", "supersedes", "overrides", "takes precedence", "prevails over")
_MSA_REFERENCE_RE = re.compile(
    r"\b(?:MSA|governing\s+agreement|master\s+agreement)\s+(?:section|clause|article|§)?\s*([0-9]{1,2}(?:\.[0-9]{1,2})*)\b",
    re.IGNORECASE,
)


def extract_references(clauses: list[dict]) -> list[dict]:
    # Build lookup by both exact sectionNumber and normalised form (strip leading zeros etc.)
    by_section: dict[str, str] = {}
    for clause in clauses:
        sn = clause.get("sectionNumber")
        if sn:
            by_section[str(sn)] = clause["id"]
            # Also index without trailing sub-parts for partial match fallback
            top = str(sn).split(".")[0]
            by_section.setdefault(top, clause["id"])

    results = []
    for clause in clauses:
        text = clause.get("text") or ""
        refs = _extract_reference_ids(text, by_section, clause["id"])
        exhibit_refs = _extract_exhibit_refs(text)
        all_refs = list(dict.fromkeys(refs + exhibit_refs))
        overrides = all_refs if _has_override_language(text) else []
        results.append({**clause, "references": all_refs, "overrides": overrides})
    return results


def _extract_reference_ids(text: str, by_section: dict[str, str], current_id: str) -> list[str]:
    refs: list[str] = []
    for match in _SECTION_RE.finditer(text):
        # Group 1: §X.Y, Group 2: section/clause/article X.Y
        section_num = match.group(1) or match.group(2)
        if not section_num:
            continue
        clause_id = by_section.get(section_num.strip())
        if clause_id and clause_id != current_id:
            refs.append(clause_id)
    # Also match MSA-prefixed cross-doc refs
    for match in _MSA_REFERENCE_RE.finditer(text):
        clause_id = by_section.get(match.group(1).strip())
        if clause_id and clause_id != current_id:
            refs.append(clause_id)
    return list(dict.fromkeys(refs))


def _extract_exhibit_refs(text: str) -> list[str]:
    """Return synthetic IDs for exhibit/schedule/annex references so they appear as
    unresolved graph endpoints when the document hasn't been uploaded."""
    refs: list[str] = []
    for match in _EXHIBIT_RE.finditer(text):
        exhibit_type = match.group(1).upper()
        exhibit_label = match.group(2).upper()
        refs.append(f"EXHIBIT:{exhibit_type}:{exhibit_label}")
    return list(dict.fromkeys(refs))


def _has_override_language(text: str) -> bool:
    lowered = text.lower()
    return any(phrase in lowered for phrase in _OVERRIDE_PHRASES)
