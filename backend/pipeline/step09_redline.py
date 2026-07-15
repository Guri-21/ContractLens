"""
Step 9 - Redline Generation.
For each high/critical finding, proposes specific alternative wording.
"""

from .llm_client import complete_json

_REDLINE_LEVELS = {"high", "critical"}


def generate_redlines(findings: list[dict], clauses: list[dict]) -> list[dict]:
    clause_map = {clause["id"]: clause for clause in clauses}
    results = []
    for finding in findings:
        if finding["status"] == "not_evaluated" or finding.get("riskLevel") not in _REDLINE_LEVELS:
            results.append(finding)
            continue

        clause = clause_map.get(finding["clauseId"])
        if not clause:
            results.append(finding)
            continue

        redline = _generate_redline(finding, clause)
        results.append({**finding, "redline": redline})
    return results


def _generate_redline(finding: dict, clause: dict) -> dict | None:
    playbook_line = ""
    if finding.get("playbookRuleViolated"):
        playbook_line = f'Playbook rule violated: {finding["playbookRuleViolated"]}'

    prompt = f"""You are a legal drafter proposing a contract redline.

Issue: {finding["reason"]}
{playbook_line}

Original clause text:
\"\"\"{clause["text"][:600]}\"\"\"

Propose a minimal rewrite that fixes ONLY the identified issue.
Keep the same structure and change as few words as possible.

Return ONLY JSON:
{{
  "originalText": "<the specific sentence or phrase to change>",
  "suggestedText": "<your replacement wording>"
}}
"""
    try:
        data = complete_json(prompt, max_tokens=512)
        if data.get("originalText") and data.get("suggestedText"):
            return {
                "originalText": data["originalText"],
                "suggestedText": data["suggestedText"],
                "diffHtml": None,
            }
    except Exception:
        return None
    return None
