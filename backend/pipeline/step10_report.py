"""
Step 10 - Report Generation.
Produces an executive summary plus structured findings JSON for PDF export.
"""

import json

from .llm_client import complete_text


def generate_report(
    clauses: list[dict],
    findings: list[dict],
    risk_score: dict,
    document_names: list[str],
) -> dict:
    summary = _executive_summary(findings, risk_score, document_names)
    return {
        "executiveSummary": summary,
        "overallScore": risk_score["overallScore"],
        "breakdown": risk_score["breakdown"],
        "totalClauses": len(clauses),
        "totalFindings": len(findings),
        "findings": findings,
        "documentNames": document_names,
    }


def _executive_summary(findings: list[dict], risk_score: dict, document_names: list[str]) -> str:
    critical = [finding for finding in findings if finding.get("riskLevel") == "critical"]
    high = [finding for finding in findings if finding.get("riskLevel") == "high"]
    not_eval = [finding for finding in findings if finding.get("status") == "not_evaluated"]
    findings_summary = json.dumps(
        [
            {
                "reason": finding["reason"],
                "riskLevel": finding.get("riskLevel"),
                "status": finding["status"],
                "playbookRuleViolated": finding.get("playbookRuleViolated"),
                "missingDocuments": finding.get("missingDocuments"),
            }
            for finding in findings[:15]
        ],
        indent=2,
    )

    prompt = f"""You are a legal risk analyst writing an executive summary.

Documents reviewed: {", ".join(document_names)}
Overall risk score: {risk_score["overallScore"]}/100
Critical findings: {len(critical)} | High: {len(high)} | Not evaluated (missing docs): {len(not_eval)}

Top findings:
{findings_summary}

Write a 3-5 sentence executive summary for a senior manager.
Be factual and specific. Do NOT fabricate numbers not given to you.
Mention the most serious risks and any missing documents by name.
"""
    return complete_text(prompt, max_tokens=400).strip()
