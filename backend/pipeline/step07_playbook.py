"""
Step 7 - Playbook Validation.
Compares clauses against active playbook rules and flags violations.
"""

import uuid

from .llm_client import complete_json


def validate_playbook(clauses: list[dict], playbook_rules: list[str]) -> list[dict]:
    if not playbook_rules:
        return []

    findings = []
    for clause in clauses:
        if not _is_clause_relevant_to_rules(clause, playbook_rules):
            continue
        findings.extend(_check_clause(clause, playbook_rules))
    return findings


def _is_clause_relevant_to_rules(clause: dict, rules: list[str]) -> bool:
    rule_text = " ".join(rules).lower()
    clause_text = f"{clause.get('title') or ''} {clause.get('text') or ''}".lower()
    clause_type = clause.get("clauseType")

    if any(word in rule_text for word in ("payment", "invoice", "net 30", "paid", "days")):
        return clause_type == "payment" or any(
            word in clause_text for word in ("payment", "invoice", "paid", "pay ", "net ")
        )

    keywords = {
        token
        for token in rule_text.replace("/", " ").replace("-", " ").split()
        if len(token) >= 5
    }
    return any(keyword in clause_text for keyword in keywords)


def _check_clause(clause: dict, rules: list[str]) -> list[dict]:
    rules_text = "\n".join(f"- {rule}" for rule in rules)
    prompt = f"""You are a legal compliance checker.

Playbook rules:
{rules_text}

Clause ({clause.get("documentName", "")}, section {clause.get("sectionNumber", "?")}):
\"\"\"{clause["text"][:600]}\"\"\"

Identify which playbook rules this clause VIOLATES, not just differs from.
Return ONLY JSON:
{{
  "violations": [
    {{
      "rule": "<exact rule text>",
      "reason": "<one sentence explanation>",
      "riskLevel": "low"
    }}
  ]
}}
Allowed riskLevel values: low, medium, high, critical.
Return an empty violations array if none.
"""
    try:
        data = complete_json(prompt, max_tokens=512)
    except Exception:
        return []

    findings = []
    for violation in data.get("violations", []):
        findings.append(
            {
                "id": f"r_{uuid.uuid4().hex[:8]}",
                "clauseId": clause["id"],
                "riskLevel": _normalise_risk(violation.get("riskLevel", "medium")),
                "status": "evaluated",
                "reason": violation.get("reason", ""),
                "playbookRuleViolated": violation.get("rule"),
                "evidence": [
                    {
                        "documentName": clause.get("documentName", ""),
                        "page": clause.get("page"),
                        "section": clause.get("sectionNumber"),
                        "quote": clause["text"][:300],
                    }
                ],
                "missingDocuments": None,
                "redline": None,
            }
        )
    return findings


def _normalise_risk(raw: str) -> str:
    risk = str(raw).lower().strip()
    return risk if risk in {"low", "medium", "high", "critical"} else "medium"
