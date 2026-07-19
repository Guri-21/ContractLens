import os
import re
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form
from prisma import Prisma
from pydantic import BaseModel

from app.database import get_db
from app.api.deps import get_current_user, require_role
from app.document_workflow import validate_reviewer_upload_type

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["documents"])
ADMIN_UPLOAD_DOCUMENT_TYPE = "MSA"
MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB
_ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}


_MAGIC_BYTES: dict[str, bytes] = {
    ".pdf": b"%PDF",
    ".docx": b"PK\x03\x04",
    ".doc": b"\xd0\xcf\x11\xe0",
}


def _safe_filename(filename: str) -> str:
    """Strip path components and reject dangerous filenames."""
    name = os.path.basename(filename.replace("\\", "/"))
    name = re.sub(r"[^\w\-. ]", "_", name)
    if not name or name.startswith(".") or os.path.splitext(name)[1].lower() not in _ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=422, detail=f"Invalid or unsupported filename: '{filename}'. Only PDF and DOCX files are allowed.")
    return name


def _validate_magic_bytes(contents: bytes, filename: str) -> None:
    """Reject files whose first bytes don't match the declared extension."""
    ext = os.path.splitext(filename)[1].lower()
    expected = _MAGIC_BYTES.get(ext)
    if expected and not contents[: len(expected)].startswith(expected):
        raise HTTPException(
            status_code=422,
            detail=f"File '{filename}' content does not match its extension. Please upload a valid {ext.upper()} file.",
        )


def _scan_for_malware(file_path: str) -> None:
    """Scan for malware via ClamAV. Silently skipped when clamd is unavailable."""
    try:
        import clamd  # type: ignore[import]
        cd = clamd.ClamdUnixSocket()
        result = cd.scan(file_path)
        if result and file_path in result:
            _status, virus = result[file_path]
            if _status == "FOUND":
                os.remove(file_path)
                raise HTTPException(
                    status_code=422,
                    detail=f"File rejected: malware detected ({virus}).",
                )
    except ImportError:
        pass
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("ClamAV scan skipped for %s: %s", os.path.basename(file_path), exc)

def _parse_json_field(value, fallback):
    """Parse Prisma Json fields that may be returned as raw strings."""
    if value is None:
        return fallback
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        try:
            return json.loads(value)
        except (json.JSONDecodeError, ValueError):
            return fallback
    return fallback


def _serialize_document(document) -> dict:
    data = document.model_dump()
    assigned_to = data.get("assigned_to")
    if assigned_to:
        data["assigned_to"] = {
            "id": assigned_to.get("id"),
            "email": assigned_to.get("email"),
        }
    # Parse JSON fields on clauses and their risks so the frontend gets real objects
    for clause in data.get("clauses") or []:
        clause["references"] = _parse_json_field(clause.get("references"), [])
        clause["overrides"] = _parse_json_field(clause.get("overrides"), [])
        clause["table_data"] = _parse_json_field(clause.get("table_data"), None)
        for risk in clause.get("risks") or []:
            risk["evidence"] = _parse_json_field(risk.get("evidence"), [])
            risk["missing_documents"] = _parse_json_field(risk.get("missing_documents"), [])
            risk["redline"] = _parse_json_field(risk.get("redline"), None)
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


def normalize_reviewer_upload_type(document_type: str) -> str:
    return validate_reviewer_upload_type(document_type.upper())


async def _validate_reviewer_assignment(db: Prisma, assigned_to_id: Optional[str]) -> None:
    if assigned_to_id is None:
        return

    assignee = await db.user.find_unique(
        where={"id": assigned_to_id},
        include={"role": True},
    )
    if not assignee or not assignee.role or assignee.role.name != "Legal Reviewer":
        raise HTTPException(
            status_code=422,
            detail="Documents can only be assigned to Legal Reviewers",
        )


def _validate_saved_file(file_path: str, filename: str) -> int:
    """Validate that a saved upload is non-empty and parseable. Returns file size."""
    file_size = os.path.getsize(file_path)
    if file_size == 0:
        os.remove(file_path)
        raise HTTPException(
            status_code=422,
            detail=f"Uploaded file '{filename}' is empty (0 bytes). Please re-upload.",
        )

    ext = os.path.splitext(filename)[1].lower()
    try:
        if ext == ".pdf":
            import pdfplumber
            with pdfplumber.open(file_path) as pdf:
                if len(pdf.pages) == 0:
                    raise ValueError("PDF has zero pages")
        elif ext in (".docx", ".doc"):
            from docx import Document as DocxDoc
            doc = DocxDoc(file_path)
            if len(doc.paragraphs) == 0:
                raise ValueError("DOCX has zero paragraphs")
    except Exception as exc:
        logger.warning("Upload validation failed for %s: %s", filename, exc)
        os.remove(file_path)
        raise HTTPException(
            status_code=422,
            detail=f"Uploaded file '{filename}' could not be read as a valid {ext.upper()} document. Please verify the file is not corrupted.",
        ) from exc

    return file_size

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    db: Prisma = Depends(get_db),
    current_user = Depends(require_role(["Legal Reviewer"]))
):
    try:
        document_type = normalize_reviewer_upload_type(document_type)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    safe_name = _safe_filename(file.filename)
    upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.abspath(os.path.join(upload_dir, safe_name))

    await file.seek(0)
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"File too large. Maximum allowed size is {MAX_UPLOAD_BYTES // (1024*1024)} MB.")
    _validate_magic_bytes(contents, safe_name)
    with open(file_path, "wb") as f:
        f.write(contents)
    _scan_for_malware(file_path)

    file_size = _validate_saved_file(file_path, safe_name)

    doc = await db.document.create(
        data={
            "name": safe_name,
            "document_type": document_type,
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

    return {
        "documentId": doc.id,
        "status": doc.status,
        "fileName": safe_name,
        "fileSize": file_size,
    }

@router.post("/admin-upload")
async def admin_upload_document(
    file: UploadFile = File(...), 
    assigned_to_id: Optional[str] = Form(None),
    db: Prisma = Depends(get_db), 
    current_user = Depends(require_role(["Admin"]))
):
    safe_name = _safe_filename(file.filename)
    existing = await db.document.find_first(where={"name": safe_name})
    if existing:
        raise HTTPException(status_code=400, detail="A document with this name already exists")

    await _validate_reviewer_assignment(db, assigned_to_id)

    upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.abspath(os.path.join(upload_dir, safe_name))

    await file.seek(0)
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"File too large. Maximum allowed size is {MAX_UPLOAD_BYTES // (1024*1024)} MB.")
    _validate_magic_bytes(contents, safe_name)
    with open(file_path, "wb") as f:
        f.write(contents)
    _scan_for_malware(file_path)

    file_size = _validate_saved_file(file_path, safe_name)

    doc = await db.document.create(
        data={
            "name": safe_name,
            "document_type": ADMIN_UPLOAD_DOCUMENT_TYPE,
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

    return {
        "documentId": doc.id,
        "status": doc.status,
        "fileName": safe_name,
        "fileSize": file_size,
    }

class AssignRequest(BaseModel):
    assigned_to_id: Optional[str] = None

@router.post("/{document_id}/assign")
async def assign_document(
    document_id: str,
    request: AssignRequest,
    db: Prisma = Depends(get_db),
    current_user = Depends(require_role(["Admin"]))
):
    await _validate_reviewer_assignment(db, request.assigned_to_id)

    doc = await db.document.update(
        where={"id": document_id},
        data={"assigned_to_id": request.assigned_to_id}
    )

    await db.auditlog.create(
        data={
            "user_id": current_user.id,
            "action": "ASSIGN_MSA" if request.assigned_to_id else "UNASSIGN_MSA",
            "target_type": "Document",
            "target_id": document_id,
        }
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
            "uploader": True,
            "assigned_to": True
        }
    )
    return [_serialize_document(document) for document in documents]

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
