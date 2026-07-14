"""
Step 4 — Dependency / Reference Extraction (Claude agent)
Finds clauses that reference, override, or nest inside others.
Outputs: each clause gets references[] and overrides[] populated.
"""
import json
import anthropic
import os
from .config import PIPELINE_CONFIG

_TRIGGER_PHRASES = [
    "notwithstanding", "subject to", "except as provided",
    "in case of conflict", "pursuant to", "as defined in",
    "as set forth in", "in accordance with", "supersedes",
    "overrides", "takes precedence",
]


def extract_references(clauses: list[dict]) -> list[dict]:
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    clause_index = {c["id"]: c for c in clauses}
    id_list = [{"id": c["id"], "section": c.get("sectionNumber", ""), "title": c.get("title", "")} for c in clauses]
    results = []
    for clause in clauses:
        if not _has_trigger(clause["text"]):
            results.append(clause)
            continue
        prompt = f"""You are analyzing legal clause references.

Available clauses (id + section):
{json.dumps(id_list, indent=2)}

Target clause ({clause["id"]}):
\"\"\"{clause["text"][:600]}\"\"\"

Return ONLY JSON:
{{
  "references": ["<clause_id>", ...],
  "overrides":  ["<clause_id>", ...]
}}
- references: clause IDs this clause explicitly references or depends on
- overrides:  clause IDs this clause supersedes or takes precedence over
- Use empty arrays if none.
"""
        resp = client.messages.create(
            model=PIPELINE_CONFIG["claude_model"],
            max_tokens=256,
            messages=[{"role": "user", "content": prompt}],
        )
        try:
            data = json.loads(resp.content[0].text)
            refs = [r for r in data.get("references", []) if r in clause_index]
            overrides = [r for r in data.get("overrides", []) if r in clause_index]
        except Exception:
            refs, overrides = [], []
        results.append({**clause, "references": refs, "overrides": overrides})
    return results


def _has_trigger(text: str) -> bool:
    t = text.lower()
    return any(phrase in t for phrase in _TRIGGER_PHRASES)
