"""
Step 9 — Redline Generation (Claude agent)
For each high/critical finding, proposes specific alternative wording.
Produces {originalText, suggestedText} pairs for word-level diffing.
"""
import json
import anthropic
import os
from .config import PIPELINE_CONFIG

_REDLINE_LEVELS = {"high", "critical"}


def generate_redlines(
    findings: list[dict],
    clauses: list[dict],
) -> list[dict]:
    clause_map = {c["id"]: c for c in clauses}
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    results = []
    for finding in findings:
        if (
            finding["status"] == "not_evaluated"
            or finding.get("riskLevel") not in _REDLINE_LEVELS
        ):
            results.append(finding)
            continue
        clause = clause_map.get(finding["clauseId"])
        if not clause:
            results.append(finding)
            continue
        redline = _call_claude(client, finding, clause)
        results.append({**finding, "redline": redline})
    return results


def _call_claude(
    client: anthropic.Anthropic,
    finding: dict,
    clause: dict,
) -> dict | None:
    prompt = f"""You are a legal drafter proposing a contract redline.

Issue: {finding["reason"]}
{f'Playbook rule violated: {finding["playbookRuleViolated"]}' if finding.get("playbookRuleViolated") else ""}

Original clause text:
\"\"\"{clause["text"][:600]}\"\"\"

Propose a minimal rewrite that fixes ONLY the identified issue.
Keep the same structure — change as few words as possible.

Return ONLY JSON:
{{
  "originalText": "<the specific sentence or phrase to change>",
  "suggestedText": "<your replacement wording>"
}}
"""
    resp = client.messages.create(
        model=PIPELINE_CONFIG["claude_model"],
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )
    try:
        data = json.loads(resp.content[0].text)
        if data.get("originalText") and data.get("suggestedText"):
            return {
                "originalText": data["originalText"],
                "suggestedText": data["suggestedText"],
                "diffHtml": None,  # Person 5 renders the diff HTML
            }
    except Exception:
        pass
    return None
