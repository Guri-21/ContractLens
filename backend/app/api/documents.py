from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from typing import List
from prisma import Prisma
from app.database import get_db
from app.api.deps import get_current_user, require_role
from pydantic import BaseModel
import os
import json

router = APIRouter(prefix="/api/documents", tags=["documents"])

class AnalyzeRequest(BaseModel):
    playbookId: str = ""
    countryCode: str = ""

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...), 
    db: Prisma = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)
    with open(file_path, "wb") as f:
        f.write(file.file.read())
        
    doc = await db.document.create(
        data={
            "name": file.filename, 
            "document_type": "MSA", 
            "status": "pending", 
            "file_path": file_path, 
            "uploaded_by_id": current_user.id
        }
    )
    
    await db.auditlog.create(
        data={
            "user_id": current_user.id, 
            "action": "UPLOAD_DOCUMENT", 
            "target_type": "Document",
            "target_id": doc.id
        }
    )
    
    return {"documentId": doc.id, "status": doc.status}

@router.get("/")
async def list_documents(db: Prisma = Depends(get_db), current_user = Depends(get_current_user)):
    return await db.document.find_many(
        include={
            "clauses": {
                "include": {
                    "risks": True
                }
            }
        }
    )
@router.post("/{document_id}/analyze")
async def analyze_document(
    document_id: str, 
    request: AnalyzeRequest,
    db: Prisma = Depends(get_db), 
    current_user = Depends(require_role(["Admin", "Legal Reviewer"]))
):
    # This is a stubbed function as requested.
    # It would normally call `runAnalysisPipeline(documents, playbookId, countryCode)`
    
    # Returning mock data mapped from our seed script or existing DB clauses
    clauses = await db.clause.find_many(where={"document_id": document_id})
    if not clauses:
        return {"clauses": [], "risks": []}
        
    clause_ids = [c.id for c in clauses]
    risks = await db.riskfinding.find_many(where={"clause_id": {"in": clause_ids}})
    
    # Parse JSON fields correctly for FastAPI response
    for c in clauses:
        if c.references: c.references = json.loads(c.references)
        if c.overrides: c.overrides = json.loads(c.overrides)
        if c.table_data: c.table_data = json.loads(c.table_data)
        
    for r in risks:
        if r.evidence: r.evidence = json.loads(r.evidence)
        if r.missing_documents: r.missing_documents = json.loads(r.missing_documents)
        if r.redline: r.redline = json.loads(r.redline)
    
    await db.auditlog.create(
        data={
            "user_id": current_user.id, 
            "action": "ANALYZE_DOCUMENT", 
            "target_type": "Document", 
            "target_id": document_id
        }
    )
    
    return {
        "clauses": clauses,
        "risks": risks
    }
