"""
Step 7 — Playbook Validation (Claude agent)
Compares clauses against active playbook rules and flags violations.
"""
import json
import uuid
import anthropic
import os
from .config import PIPELINE_CONFIG


def validate_playbook(clauses: list[dict], playbook_rules: list[str]) -> list[dict]:
    """
    playbook_rules: list of plain-English rules, e.g.
      ["Payment terms must not exceed 30 days",
       "Liability must be capped at 1x annual fees"]
    Returns RiskFindingDTO dicts for violations.
    """
    if not playbook_rules:
        return []
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    findings = []
    for clause in clauses:
        result = _check_clause(client, clause, playbook_rules)
        findings.extend(result)
    return findings


def _check_clause(
    client: anthropic.Anthropic,
    clause: dict,
    rules: list[str],
) -> list[dict]:
    rules_text = "\n".join(f"- {r}" for r in rules)
    prompt = f"""You are a legal compliance checker.

Playbook rules:
{rules_text}

Clause ({clause.get("documentName", "")}, section {clause.get("sectionNumber", "?")}):
\"\"\"{clause["text"][:600]}\"\"\"

Identify which playbook rules this clause VIOLATES (not just differs from).
Return ONLY JSON:
{{
  "violations": [
    {{
      "rule": "<exact rule text>",
      "reason": "<one sentence explanation>",
      "riskLevel": "low" | "medium" | "high" | "critical"
    }}
  ]
}}
Return empty violations array if none.
"""
    resp = client.messages.create(
        model=PIPELINE_CONFIG["claude_model"],
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )
    try:
        data = json.loads(resp.content[0].text)
    except Exception:
        return []

    findings = []
    for v in data.get("violations", []):
        findings.append({
            "id": f"r_{uuid.uuid4().hex[:8]}",
            "clauseId": clause["id"],
            "riskLevel": v.get("riskLevel", "medium"),
            "status": "evaluated",
            "reason": v.get("reason", ""),
            "playbookRuleViolated": v.get("rule"),
            "evidence": [{
                "documentName": clause.get("documentName", ""),
                "page": clause.get("page"),
                "section": clause.get("sectionNumber"),
                "quote": clause["text"][:300],
            }],
            "missingDocuments": None,
            "redline": None,
        })
    return findings
