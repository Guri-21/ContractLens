import asyncio
import json
import logging
from typing import List, Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool

_logger = logging.getLogger(__name__)
from pydantic import BaseModel, Field
from prisma import Json, Prisma

from app.api.deps import require_role
from app.api.documents import _document_access_filter
from app.core.limiter import limiter
from app.core.storage import open_plaintext, cleanup_temp
from app.database import get_db
from app.document_workflow import validate_analysis_package
from pipeline.run_pipeline import run_analysis_pipeline

# Intelligence layer (Chroma Cloud RAG). Imported lazily so a missing
# CHROMA_API_KEY or import error doesn't break the whole analyze route.
def _run_pipeline_with_intelligence(doc_dicts, playbook_rules, country_code):
    try:
        from app.intelligence.enhanced_pipeline import analyze_with_intelligence
        enhanced = analyze_with_intelligence(doc_dicts, playbook_rules, country_code)
        result = enhanced.pipeline_result
        result["_intelligence"] = {
            "total_clauses_embedded": enhanced.total_clauses_embedded,
            "total_similar_found": enhanced.total_similar_found,
            "similar_contracts_summary": enhanced.similar_contracts_summary,
        }
        return result
    except Exception as exc:
        _logger.warning("Intelligence layer unavailable (%s) — running base pipeline", exc)
        return run_analysis_pipeline(doc_dicts, playbook_rules, country_code)

router = APIRouter(prefix="/api/analyze", tags=["analyze"])


class AnalyzeRequest(BaseModel):
    msaDocumentId: str
    sowDocumentId: str
    supportingDocumentIds: List[str] = Field(default_factory=list)
    playbookId: str
    countryCode: str


def validate_analysis_request_documents(documents_by_id: dict, request: AnalyzeRequest):
    return validate_analysis_package(
        documents_by_id.values(),
        request.msaDocumentId,
        request.sowDocumentId,
        request.supportingDocumentIds,
    )


class AnalyzeDocumentRequest(BaseModel):
    id: str
    name: str
    type: Literal["MSA", "SOW", "SLA", "NDA", "EXHIBIT", "PLAYBOOK", "LAW"]
    file_path: str = Field(..., description="Absolute or backend-relative path to PDF/DOCX file")


class AnalyzeRunRequest(BaseModel):
    documents: list[AnalyzeDocumentRequest] = Field(..., min_length=1, max_length=2)
    playbook_rules: list[str] = Field(default_factory=list)
    country_code: str = "IN"


@router.post("")
@limiter.limit("20/minute")
async def analyze_documents(
    request: Request,
    req: AnalyzeRequest,
    db: Prisma = Depends(get_db),
    current_user=Depends(require_role(["Admin", "Legal Reviewer"])),
):
    requested_ids = [
        req.msaDocumentId,
        req.sowDocumentId,
        *req.supportingDocumentIds,
    ]
    unique_requested_ids = list(dict.fromkeys(requested_ids))
    docs = await db.document.find_many(
        where=_document_access_filter(current_user, unique_requested_ids),
        include={"clauses": False},
    )
    documents_by_id = {document.id: document for document in docs}
    try:
        package_documents = validate_analysis_request_documents(documents_by_id, req)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    doc_dicts = [
        {
            "id": doc.id,
            "name": doc.name,
            "type": doc.document_type,
            "file_path": doc.file_path,
            "_file_content": doc.file_content,
        }
        for doc in package_documents
    ]

    rules = await db.playbookrule.find_many(where={"is_active": True})
    playbook_rules = [f"{rule.title}: {rule.description}" for rule in rules]

    analysis_target_id = req.sowDocumentId
    # Audit records who analyzed what — document IDs and count only, never
    # document content.
    await db.auditlog.create(
        data={
            "user_id": current_user.id,
            "action": f"ANALYSIS_STARTED_{len(doc_dicts)}DOCS",
            "target_type": "AnalysisPackage",
            "target_id": analysis_target_id,
        }
    )

    # Write file bytes to short-lived temp files for the pipeline.
    # Content is stored in Neon (file_content column); file_path is just a name.
    import tempfile, os as _os
    temp_paths: list[str] = []
    for doc in doc_dicts:
        content: bytes | None = doc.pop("_file_content", None)
        if content:
            suffix = _os.path.splitext(doc["file_path"])[1] or ".pdf"
            fd, tmp = tempfile.mkstemp(suffix=suffix)
            try:
                with _os.fdopen(fd, "wb") as f:
                    f.write(content)
            except Exception:
                _os.remove(tmp)
                raise
            doc["file_path"] = tmp
            temp_paths.append(tmp)
        else:
            # Fallback for documents uploaded before this migration (local path)
            doc.pop("_file_content", None)
            usable_path, is_temp = open_plaintext(doc["file_path"])
            doc["file_path"] = usable_path
            if is_temp:
                temp_paths.append(usable_path)

    # Phase 1: run the pipeline (with timeout)
    try:
        result = await asyncio.wait_for(
            run_in_threadpool(_run_pipeline_with_intelligence, doc_dicts, playbook_rules, req.countryCode),
            timeout=300.0,
        )
    except asyncio.TimeoutError as exc:
        await db.auditlog.create(
            data={
                "user_id": current_user.id,
                "action": "ANALYSIS_TIMEOUT",
                "target_type": "AnalysisPackage",
                "target_id": analysis_target_id,
            }
        )
        raise HTTPException(
            status_code=504,
            detail="Analysis timed out after 5 minutes. Try with fewer documents.",
        ) from exc
    except Exception:
        await db.auditlog.create(
            data={
                "user_id": current_user.id,
                "action": "ANALYSIS_FAILED",
                "target_type": "AnalysisPackage",
                "target_id": analysis_target_id,
            }
        )
        raise
    finally:
        # Always shred the decrypted plaintext temp files.
        for temp_path in temp_paths:
            cleanup_temp(temp_path)

    # Phase 2: persist results — roll back partial writes on failure
    try:
        for doc in doc_dicts:
            await db.riskfinding.delete_many(where={"clause": {"is": {"document_id": doc["id"]}}})
            await db.clause.delete_many(where={"document_id": doc["id"]})

        for clause in result["clauses"]:
            await db.clause.create(data=_clause_db_payload(clause))

        for finding in result["findings"]:
            await db.riskfinding.create(data=_finding_db_payload(finding))

        for doc in doc_dicts:
            await db.document.update(where={"id": doc["id"]}, data={"status": "analyzed"})

        await db.auditlog.create(
            data={
                "user_id": current_user.id,
                "action": "ANALYSIS_COMPLETED",
                "target_type": "AnalysisPackage",
                "target_id": analysis_target_id,
            }
        )
        return _api_result(result)
    except Exception as write_exc:
        _logger.error("DB write failed after pipeline success: %s", write_exc)
        for doc in doc_dicts:
            try:
                await db.riskfinding.delete_many(where={"clause": {"is": {"document_id": doc["id"]}}})
                await db.clause.delete_many(where={"document_id": doc["id"]})
                await db.document.update(where={"id": doc["id"]}, data={"status": "failed"})
            except Exception:
                pass
        await db.auditlog.create(
            data={
                "user_id": current_user.id,
                "action": "ANALYSIS_DB_WRITE_FAILED",
                "target_type": "AnalysisPackage",
                "target_id": analysis_target_id,
            }
        )
        raise HTTPException(
            status_code=500,
            detail="Pipeline completed but results could not be saved. Please retry.",
        ) from write_exc


@router.get("")
async def get_analyze(
    db: Prisma = Depends(get_db),
    current_user=Depends(require_role(["Admin", "Legal Reviewer"])),
):
    documents = await db.document.find_many(
        where=_document_access_filter(current_user)
    )
    document_ids = [document.id for document in documents]
    risks = await db.riskfinding.find_many(
        where={"clause": {"is": {"document_id": {"in": document_ids}}}}
    )
    for risk in risks:
        risk.evidence = _json_value(risk.evidence, [])
        risk.missing_documents = _json_value(risk.missing_documents, [])
        risk.redline = _json_value(risk.redline, None)
    return risks


@router.post("/run")
def run_real_analysis(
    payload: AnalyzeRunRequest,
    current_user=Depends(require_role(["Admin"])),
):
    result = run_analysis_pipeline(
        documents=[doc.dict() for doc in payload.documents],
        playbook_rules=payload.playbook_rules,
        country_code=payload.country_code,
    )
    return _api_result(result)


def _clause_db_payload(clause: dict) -> dict:
    payload = {
        "id": clause["id"],
        "document_id": clause["documentId"],
        "document_name": clause["documentName"],
        "document_type": clause["documentType"],
        "section_number": clause.get("sectionNumber"),
        "title": clause.get("title"),
        "page": clause.get("page"),
        "text": clause["text"],
        "clause_type": clause.get("clauseType"),
        "references": Json(clause.get("references", [])),
        "overrides": Json(clause.get("overrides", [])),
    }
    if clause.get("tableData") is not None:
        payload["table_data"] = Json(clause.get("tableData"))
    return payload


def _finding_db_payload(finding: dict) -> dict:
    payload = {
        "id": finding["id"],
        "clause_id": finding["clauseId"],
        "risk_level": finding["riskLevel"],
        "status": finding["status"],
        "reason": finding["reason"],
        "playbook_rule_violated": finding.get("playbookRuleViolated"),
        "contradiction_type": finding.get("contradictionType"),
        "confidence": finding.get("confidence"),
        "comparison_text": finding.get("comparisonText"),
        "evidence": Json(finding.get("evidence", [])),
        "missing_documents": Json(finding.get("missingDocuments", [])),
    }
    if finding.get("redline") is not None:
        payload["redline"] = Json(finding.get("redline"))
    return payload


def _api_result(result: dict) -> dict:
    intelligence = result.pop("_intelligence", None)
    base = {**result, "risks": result.get("findings", [])}
    if intelligence:
        base["intelligence"] = intelligence
    return base


def _json_value(value, fallback):
    if value is None:
        return fallback
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return fallback
    return value
