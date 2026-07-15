import json
from typing import List, Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from prisma import Json, Prisma

from app.api.deps import require_role
from app.api.documents import _document_access_filter
from app.database import get_db
from app.document_workflow import validate_analysis_package
from pipeline.run_pipeline import run_analysis_pipeline

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
async def analyze_documents(
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
        where=_document_access_filter(current_user, unique_requested_ids)
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
        }
        for doc in package_documents
    ]

    rules = await db.playbookrule.find_many(where={"is_active": True})
    playbook_rules = [f"{rule.title}: {rule.description}" for rule in rules]
    result = await run_in_threadpool(run_analysis_pipeline, doc_dicts, playbook_rules, req.countryCode)

    for doc in doc_dicts:
        await db.riskfinding.delete_many(where={"clause": {"is": {"document_id": doc["id"]}}})
        await db.clause.delete_many(where={"document_id": doc["id"]})

    for clause in result["clauses"]:
        await db.clause.create(data=_clause_db_payload(clause))

    for finding in result["findings"]:
        await db.riskfinding.create(data=_finding_db_payload(finding))

    for doc in doc_dicts:
        await db.document.update(where={"id": doc["id"]}, data={"status": "analyzed"})

    return _api_result(result)


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
        "evidence": Json(finding.get("evidence", [])),
        "missing_documents": Json(finding.get("missingDocuments", [])),
    }
    if finding.get("redline") is not None:
        payload["redline"] = Json(finding.get("redline"))
    return payload


def _api_result(result: dict) -> dict:
    return {
        **result,
        "risks": result.get("findings", []),
    }


def _json_value(value, fallback):
    if value is None:
        return fallback
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return fallback
    return value
