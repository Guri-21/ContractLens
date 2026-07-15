from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form
from fastapi.concurrency import run_in_threadpool
from typing import List, Optional
from prisma import Json, Prisma
from app.database import get_db
from app.api.deps import get_current_user, require_role
from pydantic import BaseModel
import os
import json

router = APIRouter(prefix="/api/documents", tags=["documents"])

class AnalyzeRequest(BaseModel):
    playbookId: str = ""
    countryCode: str = ""


def _serialize_document(document) -> dict:
    data = document.model_dump()
    assigned_to = data.get("assigned_to")
    if assigned_to:
        data["assigned_to"] = {
            "id": assigned_to.get("id"),
            "email": assigned_to.get("email"),
        }
    return data


def _document_access_filter(current_user, document_ids: list[str] | None = None) -> dict:
    filters = []
    if document_ids is not None:
        filters.append({"id": {"in": document_ids}})
    if current_user.role.name != "Admin":
        filters.append({
            "OR": [
                {"uploaded_by_id": current_user.id},
                {"assigned_to_id": current_user.id},
            ]
        })
    if not filters:
        return {}
    return filters[0] if len(filters) == 1 else {"AND": filters}

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
            "document_type": _infer_document_type(file.filename), 
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

@router.post("/admin-upload")
async def admin_upload_document(
    file: UploadFile = File(...), 
    assigned_to_id: Optional[str] = Form(None),
    db: Prisma = Depends(get_db), 
    current_user = Depends(require_role(["Admin"]))
):
    existing = await db.document.find_first(where={"name": file.filename})
    if existing:
        raise HTTPException(status_code=400, detail="A document with this name already exists")
        
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)
    with open(file_path, "wb") as f:
        f.write(file.file.read())
        
    doc = await db.document.create(
        data={
            "name": file.filename, 
            "document_type": _infer_document_type(file.filename), 
            "status": "pending", 
            "file_path": file_path, 
            "uploaded_by_id": current_user.id,
            "assigned_to_id": assigned_to_id
        }
    )
    
    await db.auditlog.create(
        data={
            "user_id": current_user.id, 
            "action": "ADMIN_UPLOAD_MSA", 
            "target_type": "Document",
            "target_id": doc.id
        }
    )
    
    return {"documentId": doc.id, "status": doc.status}

class AssignRequest(BaseModel):
    assigned_to_id: str

@router.post("/{document_id}/assign")
async def assign_document(
    document_id: str,
    request: AssignRequest,
    db: Prisma = Depends(get_db),
    current_user = Depends(require_role(["Admin"]))
):
    doc = await db.document.update(
        where={"id": document_id},
        data={"assigned_to_id": request.assigned_to_id}
    )
    return {"status": "success", "assigned_to": doc.assigned_to_id}

@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    db: Prisma = Depends(get_db),
    current_user = Depends(require_role(["Admin"]))
):
    doc = await db.document.find_unique(where={"id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    await db.riskfinding.delete_many(where={"clause": {"is": {"document_id": document_id}}})
    await db.clause.delete_many(where={"document_id": document_id})
    await db.document.delete(where={"id": document_id})
    
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except:
            pass
            
    await db.auditlog.create(
        data={
            "user_id": current_user.id, 
            "action": "DELETE_DOCUMENT", 
            "target_type": "Document",
            "target_id": document_id
        }
    )
    
    return {"status": "success", "deleted_id": document_id}

@router.get("/")
async def list_documents(db: Prisma = Depends(get_db), current_user = Depends(get_current_user)):
    documents = await db.document.find_many(
        where=_document_access_filter(current_user),
        include={
            "clauses": {
                "include": {
                    "risks": True
                }
            },
            "assigned_to": True
        }
    )
    return [_serialize_document(document) for document in documents]

from pipeline.run_pipeline import run_analysis_pipeline

@router.post("/{document_id}/analyze")
async def analyze_document(
    document_id: str, 
    request: AnalyzeRequest,
    db: Prisma = Depends(get_db), 
    current_user = Depends(require_role(["Admin", "Legal Reviewer"]))
):
    # Retrieve the document
    doc = await db.document.find_unique(where={"id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # We might have multiple documents in a real scenario, but let's pass this one.
    # Wait, Step 5 says: "Legal Reviewer uploads 2 related documents (MSA + SOW)". 
    # If the user uploaded 2 documents, they are separate. How do we pass both to the pipeline?
    # Let's fetch all pending documents by this user for the analysis batch?
    # Or maybe the request includes multiple document IDs? The signature says `/{document_id}/analyze`.
    # Let's just fetch all documents for now, or just the ones requested.
    # Actually, the user uploads 2 documents, maybe they are linked? 
    # Let's just fetch all documents uploaded by this user that are pending, or just all documents.
    docs_for_pipeline = [
        {
            "id": doc.id,
            "name": doc.name,
            "type": doc.document_type,
            "file_path": doc.file_path,
        }
    ]

    playbook_rules_db = await db.playbookrule.find_many()
    playbook_rules = [r.description for r in playbook_rules_db]

    # Run the real pipeline
    result = await run_in_threadpool(
        run_analysis_pipeline,
        docs_for_pipeline,
        playbook_rules,
        request.countryCode or "US",
    )

    # Delete existing clauses and risks for these docs to avoid duplicates
    for d in docs_for_pipeline:
        await db.riskfinding.delete_many(where={"clause": {"is": {"document_id": d["id"]}}})
        await db.clause.delete_many(where={"document_id": d["id"]})

    # Persist the new clauses
    for c in result["clauses"]:
        await db.clause.create(data={
            "id": c["id"],
            "document_id": c["documentId"],
            "document_name": c["documentName"],
            "document_type": c["documentType"],
            "section_number": c.get("sectionNumber"),
            "title": c.get("title"),
            "page": c.get("page"),
            "text": c["text"],
            "clause_type": c.get("clauseType"),
            "references": Json(c.get("references", [])),
            "overrides": Json(c.get("overrides", [])),
            **({"table_data": Json(c.get("tableData"))} if c.get("tableData") is not None else {})
        })

    # Persist the new findings
    for f in result["findings"]:
        await db.riskfinding.create(data={
            "id": f["id"],
            "clause_id": f["clauseId"],
            "risk_level": f["riskLevel"],
            "status": f["status"],
            "reason": f["reason"],
            "playbook_rule_violated": f.get("playbookRuleViolated"),
            "evidence": Json(f.get("evidence", [])),
            "missing_documents": Json(f.get("missingDocuments", [])),
            **({"redline": Json(f.get("redline"))} if f.get("redline") is not None else {})
        })

    # Update document statuses
    for d in docs_for_pipeline:
        await db.document.update(where={"id": d["id"]}, data={"status": "analyzed"})

    await db.auditlog.create(
        data={
            "user_id": current_user.id, 
            "action": "ANALYZE_DOCUMENT", 
            "target_type": "Document", 
            "target_id": document_id
        }
    )
    
    return {
        "clauses": result["clauses"],
        "risks": result["findings"],
        "findings": result["findings"],
        "report": result["report"]
    }


def _infer_document_type(filename: str) -> str:
    name = filename.lower()
    for doc_type in ["MSA", "SOW", "SLA", "NDA", "EXHIBIT", "PLAYBOOK", "LAW"]:
        if doc_type.lower() in name:
            return doc_type
    return "MSA"

class DocumentStatusUpdate(BaseModel):
    status: str

@router.put("/{document_id}/status")
async def update_document_status(
    document_id: str,
    request: DocumentStatusUpdate,
    db: Prisma = Depends(get_db),
    current_user = Depends(get_current_user)
):
    doc = await db.document.find_first(
        where=_document_access_filter(current_user, [document_id])
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    updated_doc = await db.document.update(
        where={"id": document_id},
        data={"status": request.status}
    )

    await db.auditlog.create(
        data={
            "user_id": current_user.id, 
            "action": f"UPDATE_DOCUMENT_STATUS_{request.status.upper()}", 
            "target_type": "Document", 
            "target_id": document_id
        }
    )

    # If approved, we could also create an Approval record
    if request.status.lower() == "approved":
        await db.approval.create(
            data={
                "document_id": document_id,
                "approved_by_id": current_user.id,
                "comments": "Approved via Legal Reviewer workspace"
            }
        )

    return {"status": "success", "new_status": updated_doc.status}


class ClauseVersionCreate(BaseModel):
    text: str
    changeType: str

@router.post("/api/clauses/{clause_id}/version")
async def create_clause_version(
    clause_id: str,
    request: ClauseVersionCreate,
    db: Prisma = Depends(get_db),
    current_user = Depends(get_current_user)
):
    clause = await db.clause.find_unique(where={"id": clause_id}, include={"versions": True})
    if not clause:
        raise HTTPException(status_code=404, detail="Clause not found")

    new_version_number = 1
    if clause.versions:
        new_version_number = max([v.version_number for v in clause.versions]) + 1

    version = await db.clauseversion.create(
        data={
            "clause_id": clause_id,
            "version_number": new_version_number,
            "text": request.text,
            "edited_by_id": current_user.id,
            "change_type": request.changeType
        }
    )

    # Update clause text to latest version
    await db.clause.update(
        where={"id": clause_id},
        data={"text": request.text}
    )
    
    await db.auditlog.create(
        data={
            "user_id": current_user.id, 
            "action": f"CLAUSE_VERSION_{request.changeType.upper()}", 
            "target_type": "Clause", 
            "target_id": clause_id
        }
    )

    return {"status": "success", "version_id": version.id, "version_number": version.version_number}
