"""
Step 4 - Dependency / Reference Extraction.

Deterministically maps explicit section references to known clause IDs.
"""

import re

_REFERENCE_RE = re.compile(
    r"\b(?:section|clause|article|paragraph)\s+([0-9]{1,2}(?:\.[0-9]{1,2})*)\b",
    re.IGNORECASE,
)
_OVERRIDE_PHRASES = ("notwithstanding", "supersedes", "overrides", "takes precedence")


def extract_references(clauses: list[dict]) -> list[dict]:
    by_section = {
        str(clause.get("sectionNumber")): clause["id"]
        for clause in clauses
        if clause.get("sectionNumber")
    }

    results = []
    for clause in clauses:
        text = clause.get("text") or ""
        refs = _extract_reference_ids(text, by_section, clause["id"])
        overrides = refs if _has_override_language(text) else []
        results.append({**clause, "references": refs, "overrides": overrides})
    return results


def _extract_reference_ids(text: str, by_section: dict[str, str], current_id: str) -> list[str]:
    refs = []
    for match in _REFERENCE_RE.finditer(text):
        clause_id = by_section.get(match.group(1))
        if clause_id and clause_id != current_id:
            refs.append(clause_id)
    return list(dict.fromkeys(refs))


def _has_override_language(text: str) -> bool:
    lowered = text.lower()
    return any(phrase in lowered for phrase in _OVERRIDE_PHRASES)
