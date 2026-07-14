# Owner: Person 3 — analyze.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from prisma import Prisma
from app.database import get_db
import json
from pipeline.run_pipeline import run_analysis_pipeline

router = APIRouter(prefix="/api/analyze", tags=["analyze"])

class AnalyzeRequest(BaseModel):
    documentIds: List[str]
    playbookId: str
    countryCode: str

@router.post("")
async def analyze_documents(req: AnalyzeRequest, db: Prisma = Depends(get_db)):
    # Fetch documents
    docs = await db.document.find_many(where={"id": {"in": req.documentIds}})
    if not docs:
        raise HTTPException(status_code=404, detail="Documents not found")
    
    doc_dicts = [
        {
            "id": d.id,
            "name": d.name,
            "type": d.document_type,
            "file_path": d.file_path,
        }
        for d in docs
    ]
    
    # Fetch playbook rules
    rules = await db.playbookrule.find_many(where={"is_active": True})
    playbook_rules = [f"{r.title}: {r.description}" for r in rules]
    
    # Run the pipeline
    result = run_analysis_pipeline(doc_dicts, playbook_rules, req.countryCode)
    
    # Save clauses to DB
    for c in result["clauses"]:
        await db.clause.upsert(
            where={"id": c["id"]},
            data={
                "create": {
                    "id": c["id"],
                    "document_id": c["documentId"],
                    "document_name": c["documentName"],
                    "document_type": c["documentType"],
                    "section_number": c.get("sectionNumber"),
                    "title": c.get("title"),
                    "page": c.get("page"),
                    "text": c["text"],
                    "clause_type": c.get("clauseType"),
                    "references": json.dumps(c.get("references", [])),
                    "overrides": json.dumps(c.get("overrides", [])),
                    "table_data": json.dumps(c.get("tableData")) if c.get("tableData") else None,
                },
                "update": {
                    "document_name": c["documentName"],
                    "document_type": c["documentType"],
                    "section_number": c.get("sectionNumber"),
                    "title": c.get("title"),
                    "page": c.get("page"),
                    "text": c["text"],
                    "clause_type": c.get("clauseType"),
                    "references": json.dumps(c.get("references", [])),
                    "overrides": json.dumps(c.get("overrides", [])),
                    "table_data": json.dumps(c.get("tableData")) if c.get("tableData") else None,
                }
            }
        )
        
    # Save risks to DB
    for r in result["findings"]:
        await db.riskfinding.upsert(
            where={"id": r["id"]},
            data={
                "create": {
                    "id": r["id"],
                    "clause_id": r["clauseId"],
                    "risk_level": r["riskLevel"],
                    "status": r["status"],
                    "reason": r["reason"],
                    "playbook_rule_violated": r.get("playbookRuleViolated"),
                    "evidence": json.dumps(r.get("evidence", [])),
                    "missing_documents": json.dumps(r.get("missingDocuments", [])),
                    "redline": json.dumps(r.get("redline")) if r.get("redline") else None,
                },
                "update": {
                    "risk_level": r["riskLevel"],
                    "status": r["status"],
                    "reason": r["reason"],
                    "playbook_rule_violated": r.get("playbookRuleViolated"),
                    "evidence": json.dumps(r.get("evidence", [])),
                    "missing_documents": json.dumps(r.get("missingDocuments", [])),
                    "redline": json.dumps(r.get("redline")) if r.get("redline") else None,
                }
            }
        )
        
    return result

@router.get("")
async def get_analyze(db: Prisma = Depends(get_db)):
    risks = await db.riskfinding.find_many()
    for r in risks:
        if r.evidence: r.evidence = json.loads(r.evidence)
        if r.missing_documents: r.missing_documents = json.loads(r.missing_documents)
        if r.redline: r.redline = json.loads(r.redline)
    return risks

