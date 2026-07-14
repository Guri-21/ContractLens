"""
Step 10 — Report Generation (Claude agent + templating)
Produces an executive summary + structured findings JSON for PDF export.
"""
import json
import anthropic
import os
from .config import PIPELINE_CONFIG


def generate_report(
    clauses: list[dict],
    findings: list[dict],
    risk_score: dict,
    document_names: list[str],
) -> dict:
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    summary = _executive_summary(client, clauses, findings, risk_score, document_names)
    return {
        "executiveSummary": summary,
        "overallScore": risk_score["overallScore"],
        "breakdown": risk_score["breakdown"],
        "totalClauses": len(clauses),
        "totalFindings": len(findings),
        "findings": findings,
        "documentNames": document_names,
    }


def _executive_summary(
    client: anthropic.Anthropic,
    clauses: list[dict],
    findings: list[dict],
    risk_score: dict,
    document_names: list[str],
) -> str:
    critical = [f for f in findings if f.get("riskLevel") == "critical"]
    high = [f for f in findings if f.get("riskLevel") == "high"]
    not_eval = [f for f in findings if f.get("status") == "not_evaluated"]

    findings_summary = json.dumps([
        {
            "reason": f["reason"],
            "riskLevel": f.get("riskLevel"),
            "status": f["status"],
            "playbookRuleViolated": f.get("playbookRuleViolated"),
        }
        for f in findings[:15]  # cap to avoid token overflow
    ], indent=2)

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
    resp = client.messages.create(
        model=PIPELINE_CONFIG["claude_model"],
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}],
    )
    return resp.content[0].text.strip()
