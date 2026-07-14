"""
Step 8 — Risk Scoring (deterministic)
Aggregates all findings and computes an overall risk score 0-100.
No LLM call — pure arithmetic so the score is reproducible.
"""

_LEVEL_WEIGHT = {"low": 1, "medium": 3, "high": 7, "critical": 15}
_NOT_EVAL_WEIGHT = 5  # missing-doc findings carry their own weight


def score_risk(findings: list[dict]) -> dict:
    """
    Returns {
      "overallScore": int (0-100),
      "breakdown": {"critical": n, "high": n, "medium": n, "low": n, "not_evaluated": n}
    }
    """
    counts: dict[str, int] = {
        "critical": 0, "high": 0, "medium": 0, "low": 0, "not_evaluated": 0
    }
    raw = 0
    for f in findings:
        if f["status"] == "not_evaluated":
            counts["not_evaluated"] += 1
            raw += _NOT_EVAL_WEIGHT
        else:
            lvl = f.get("riskLevel", "low")
            counts[lvl] = counts.get(lvl, 0) + 1
            raw += _LEVEL_WEIGHT.get(lvl, 1)

    # Normalise: cap at 100, scale so ~10 high findings = score 70
    score = min(100, int(raw * 1.5))
    return {"overallScore": score, "breakdown": counts}
