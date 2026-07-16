from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from datetime import datetime, timedelta, timezone
from prisma import Prisma
from app.database import get_db
from app.api.deps import require_role

router = APIRouter(prefix="/api/admin", tags=["admin_analytics"])

def _generate_ai_insights(advisor_id: str, documents: list) -> list:
    # A simple deterministic rule-based insight generator since we don't have an LLM hooked up here
    total_docs = len(documents)
    if total_docs == 0:
        return ["This advisor has not processed any documents yet."]
    
    insights = []
    
    # Doc types
    types = {}
    total_risks = 0
    high_risks = 0
    clause_types = {}
    
    for doc in documents:
        doc_type = doc.document_type or "Unknown"
        types[doc_type] = types.get(doc_type, 0) + 1
        
        for clause in (doc.clauses or []):
            ct = clause.clause_type or "general"
            clause_types[ct] = clause_types.get(ct, 0) + 1
            for risk in (clause.risks or []):
                total_risks += 1
                if risk.risk_level in ["high", "critical"]:
                    high_risks += 1

    if types:
        most_common_type = max(types.items(), key=lambda x: x[1])[0]
        insights.append(f"This advisor mostly handles {most_common_type} risk reviews.")
    
    if clause_types:
        most_common_clause = max(clause_types.items(), key=lambda x: x[1])[0]
        insights.append(f"Most frequently reviewed clause: {most_common_clause.capitalize()}.")

    if high_risks > 0 and total_risks > 0:
        ratio = high_risks / total_risks
        if ratio > 0.3:
            insights.append("High volume of critical/high risks flagged. Recommended focus: standardization of templates.")
        else:
            insights.append("Risk profile is generally low to medium. Standard review procedures are effective.")
            
    return insights

def _risk_counts_for_document(doc) -> dict:
    counts = {"risks": 0, "high": 0, "critical": 0}
    for clause in (doc.clauses or []):
        for risk in (clause.risks or []):
            counts["risks"] += 1
            if risk.risk_level == "high":
                counts["high"] += 1
            elif risk.risk_level == "critical":
                counts["critical"] += 1
    return counts


def _trend_date_for_document(doc, audit_logs: list, today: datetime) -> str:
    for log in audit_logs:
        if log.target_id == doc.id and log.action == "ANALYSIS_COMPLETED":
            timestamp = log.timestamp
            if timestamp.tzinfo is None:
                timestamp = timestamp.replace(tzinfo=timezone.utc)
            return timestamp.astimezone(timezone.utc).date().isoformat()
    return today.date().isoformat()


def _build_risk_trend(documents: list, audit_logs: list | None = None) -> list:
    audit_logs = audit_logs or []
    today = datetime.now(timezone.utc)
    start_date = today.date() - timedelta(days=6)
    buckets = {
        (start_date + timedelta(days=offset)).isoformat(): {
            "date": (start_date + timedelta(days=offset)).strftime("%b %d"),
            "risks": 0,
            "high": 0,
            "critical": 0,
        }
        for offset in range(7)
    }

    has_risk_data = False
    for doc in documents:
        counts = _risk_counts_for_document(doc)
        if counts["risks"] == 0:
            continue

        has_risk_data = True
        bucket_key = _trend_date_for_document(doc, audit_logs, today)
        if bucket_key not in buckets:
            continue

        buckets[bucket_key]["risks"] += counts["risks"]
        buckets[bucket_key]["high"] += counts["high"]
        buckets[bucket_key]["critical"] += counts["critical"]

    return list(buckets.values()) if has_risk_data else []


def _aggregate_document_data(documents: list, audit_logs: list | None = None) -> dict:
    total_clauses = 0
    total_risks = 0
    high_risk_count = 0
    critical_risk_count = 0
    not_evaluated_count = 0
    
    risk_distribution = {"low": 0, "medium": 0, "high": 0, "critical": 0, "not_evaluated": 0}
    clause_type_risk = {}
    document_analytics = []
    
    for doc in documents:
        doc_clauses = doc.clauses or []
        total_clauses += len(doc_clauses)
        
        doc_risks = 0
        doc_risk_score = 0
        doc_top_risks = []
        
        for clause in doc_clauses:
            ctype = clause.clause_type or "general"
            if ctype not in clause_type_risk:
                clause_type_risk[ctype] = {"clauseType": ctype, "low": 0, "medium": 0, "high": 0, "critical": 0}
                
            for risk in (clause.risks or []):
                total_risks += 1
                doc_risks += 1
                level = risk.risk_level or "not_evaluated"
                
                if level in risk_distribution:
                    risk_distribution[level] += 1
                else:
                    risk_distribution["not_evaluated"] += 1
                    
                if level == "high":
                    high_risk_count += 1
                    doc_risk_score += 3
                    clause_type_risk[ctype]["high"] += 1
                    doc_top_risks.append(risk.reason)
                elif level == "critical":
                    critical_risk_count += 1
                    doc_risk_score += 5
                    clause_type_risk[ctype]["critical"] += 1
                    doc_top_risks.append(risk.reason)
                elif level == "medium":
                    doc_risk_score += 2
                    clause_type_risk[ctype]["medium"] += 1
                elif level == "low":
                    doc_risk_score += 1
                    clause_type_risk[ctype]["low"] += 1
                else:
                    not_evaluated_count += 1
                    
        document_analytics.append({
            "documentId": doc.id,
            "documentName": doc.name,
            "documentType": doc.document_type,
            "status": doc.status,
            "totalClauses": len(doc_clauses),
            "totalRisks": doc_risks,
            "riskScore": doc_risk_score,
            "topRisks": list(set(doc_top_risks))[:3]
        })

    avg_score = 0
    if total_risks > 0:
        avg_score = round(((risk_distribution["low"] * 1) + (risk_distribution["medium"] * 2) + (risk_distribution["high"] * 3) + (risk_distribution["critical"] * 5)) / total_risks, 1)

    return {
        "summary": {
            "totalDocuments": len(documents),
            "analyzedDocuments": len([d for d in documents if d.status == "analyzed"]),
            "pendingDocuments": len([d for d in documents if d.status != "analyzed"]),
            "totalClauses": total_clauses,
            "totalRisks": total_risks,
            "highRiskCount": high_risk_count,
            "criticalRiskCount": critical_risk_count,
            "notEvaluatedCount": not_evaluated_count,
            "averageRiskScore": avg_score
        },
        "riskDistribution": [
            {"level": "low", "count": risk_distribution["low"]},
            {"level": "medium", "count": risk_distribution["medium"]},
            {"level": "high", "count": risk_distribution["high"]},
            {"level": "critical", "count": risk_distribution["critical"]},
            {"level": "not_evaluated", "count": risk_distribution["not_evaluated"]}
        ],
        "clauseTypeRisk": list(clause_type_risk.values()),
        "documentAnalytics": document_analytics,
        "trend": _build_risk_trend(documents, audit_logs)
    }

@router.get("/advisors/{advisor_id}/analytics")
async def get_advisor_analytics(advisor_id: str, db: Prisma = Depends(get_db), current_user = Depends(require_role(["Admin"]))):
    advisor = await db.user.find_unique(where={"id": advisor_id}, include={"role": True})
    if not advisor:
        raise HTTPException(status_code=404, detail="Advisor not found")

    documents = await db.document.find_many(
        where={
            "OR": [
                {"uploaded_by_id": advisor_id},
                {"assigned_to_id": advisor_id}
            ]
        },
        include={
            "clauses": {
                "include": {
                    "risks": True
                }
            }
        }
    )
    document_ids = [document.id for document in documents]
    audit_logs = await db.auditlog.find_many(
        where={
            "action": "ANALYSIS_COMPLETED",
            "target_id": {"in": document_ids},
        }
    )

    aggregated = _aggregate_document_data(documents, audit_logs)
    
    return {
        "advisor": {
            "id": advisor.id,
            "email": advisor.email,
            "role": advisor.role.name if advisor.role else "Unknown"
        },
        **aggregated,
        "aiInsights": _generate_ai_insights(advisor_id, documents)
    }

@router.get("/analytics")
async def get_global_analytics(db: Prisma = Depends(get_db), current_user = Depends(require_role(["Admin"]))):
    documents = await db.document.find_many(
        include={
            "clauses": {
                "include": {
                    "risks": True
                }
            },
            "assigned_to": True
        }
    )
    document_ids = [document.id for document in documents]
    audit_logs = await db.auditlog.find_many(
        where={
            "action": "ANALYSIS_COMPLETED",
            "target_id": {"in": document_ids},
        }
    )
    
    aggregated = _aggregate_document_data(documents, audit_logs)
    
    # Advisor Leaderboard
    advisors_perf = {}
    for doc in documents:
        user = doc.assigned_to
        if not user:
            continue
        uid = user.id
        if uid not in advisors_perf:
            advisors_perf[uid] = {"id": uid, "email": user.email, "docs": 0, "risks": 0, "highRisks": 0}
        
        advisors_perf[uid]["docs"] += 1
        for c in (doc.clauses or []):
            for r in (c.risks or []):
                advisors_perf[uid]["risks"] += 1
                if r.risk_level in ["high", "critical"]:
                    advisors_perf[uid]["highRisks"] += 1
                    
    leaderboard = list(advisors_perf.values())
    leaderboard.sort(key=lambda x: x["docs"], reverse=True)
    
    return {
        **aggregated,
        "leaderboard": leaderboard
    }
