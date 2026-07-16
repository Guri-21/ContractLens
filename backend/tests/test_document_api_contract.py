from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.api.analyze import AnalyzeRequest, validate_analysis_request_documents
from app.api.deps import get_current_user
from app.api.documents import (
    ADMIN_UPLOAD_DOCUMENT_TYPE,
    normalize_reviewer_upload_type,
    router as documents_router,
)
from app.database import get_db


def document(document_id, document_type):
    return SimpleNamespace(id=document_id, document_type=document_type)


def test_admin_upload_document_type_is_always_msa():
    assert ADMIN_UPLOAD_DOCUMENT_TYPE == "MSA"


def test_reviewer_upload_normalizes_and_accepts_explicit_sow_type():
    assert normalize_reviewer_upload_type("sow") == "SOW"


@pytest.mark.parametrize("document_type", ["msa", "playbook", "law"])
def test_reviewer_upload_rejects_forbidden_explicit_types(document_type):
    with pytest.raises(ValueError, match="Legal Reviewers cannot upload"):
        normalize_reviewer_upload_type(document_type)


def test_analysis_request_parses_role_aware_document_ids():
    request = AnalyzeRequest.model_validate(
        {
            "msaDocumentId": "msa-1",
            "sowDocumentId": "sow-1",
            "supportingDocumentIds": ["nda-1"],
            "playbookId": "playbook-1",
            "countryCode": "IN",
        }
    )

    assert request.msaDocumentId == "msa-1"
    assert request.sowDocumentId == "sow-1"
    assert request.supportingDocumentIds == ["nda-1"]


def test_analysis_request_rejects_legacy_document_ids_contract():
    with pytest.raises(ValidationError):
        AnalyzeRequest.model_validate(
            {
                "documentIds": ["msa-1", "sow-1"],
                "playbookId": "playbook-1",
                "countryCode": "IN",
            }
        )


def test_analysis_validation_orders_exact_accessible_package():
    request = AnalyzeRequest.model_validate(
        {
            "msaDocumentId": "msa-1",
            "sowDocumentId": "sow-1",
            "supportingDocumentIds": ["nda-1"],
            "playbookId": "playbook-1",
            "countryCode": "IN",
        }
    )
    documents_by_id = {
        "msa-1": document("msa-1", "MSA"),
        "sow-1": document("sow-1", "SOW"),
        "nda-1": document("nda-1", "NDA"),
        "extra-1": document("extra-1", "EXHIBIT"),
    }

    package = validate_analysis_request_documents(documents_by_id, request)

    assert [item.id for item in package] == ["msa-1", "sow-1", "nda-1"]


def test_analysis_validation_rejects_inaccessible_requested_document():
    request = AnalyzeRequest.model_validate(
        {
            "msaDocumentId": "msa-1",
            "sowDocumentId": "sow-1",
            "supportingDocumentIds": ["nda-1"],
            "playbookId": "playbook-1",
            "countryCode": "IN",
        }
    )

    with pytest.raises(ValueError, match="unavailable"):
        validate_analysis_request_documents(
            {
                "msa-1": document("msa-1", "MSA"),
                "sow-1": document("sow-1", "SOW"),
            },
            request,
        )


class FakeDocumentTable:
    def __init__(self):
        self.created = []
        self.updated = []

    async def create(self, data):
        self.created.append(data)
        return SimpleNamespace(id="document-1", status=data["status"])

    async def update(self, where, data):
        self.updated.append({"where": where, "data": data})
        return SimpleNamespace(id=where["id"], assigned_to_id=data.get("assigned_to_id"))


class FakeAuditLogTable:
    def __init__(self):
        self.created = []

    async def create(self, data):
        self.created.append(data)
        return data


class FakeUserTable:
    async def find_unique(self, where, include=None):
        if where.get("id") == "advisor-1":
            return SimpleNamespace(id="advisor-1", role=SimpleNamespace(name="Legal Reviewer"))
        return None


class FakeDatabase:
    def __init__(self):
        self.document = FakeDocumentTable()
        self.auditlog = FakeAuditLogTable()
        self.user = FakeUserTable()


def build_document_client(current_user=None):
    app = FastAPI()
    database = FakeDatabase()
    app.include_router(documents_router)
    app.dependency_overrides[get_db] = lambda: database
    if current_user is not None:
        app.dependency_overrides[get_current_user] = lambda: current_user
    return TestClient(app), database


def upload_payload():
    return {
        "files": {"file": ("scope-of-work.pdf", b"contract", "application/pdf")},
        "data": {"document_type": "SOW"},
    }


def user_with_role(role_name):
    return SimpleNamespace(
        id=f"{role_name.lower().replace(' ', '-')}-1",
        role=SimpleNamespace(name=role_name),
    )


def test_document_upload_rejects_anonymous_requests(monkeypatch, tmp_path):
    monkeypatch.chdir(tmp_path)
    client, _ = build_document_client()

    response = client.post("/api/documents/upload", **upload_payload())

    assert response.status_code == 401


def test_document_upload_rejects_admin_requests(monkeypatch, tmp_path):
    monkeypatch.chdir(tmp_path)
    client, _ = build_document_client(user_with_role("Admin"))

    response = client.post("/api/documents/upload", **upload_payload())

    assert response.status_code == 403


def test_document_upload_accepts_legal_reviewer_requests(monkeypatch, tmp_path):
    monkeypatch.chdir(tmp_path)
    client, database = build_document_client(user_with_role("Legal Reviewer"))

    response = client.post("/api/documents/upload", **upload_payload())

    assert response.status_code == 200
    assert database.document.created[0]["document_type"] == "SOW"


def test_legacy_document_analyze_route_is_unavailable():
    client, _ = build_document_client()

    response = client.post("/api/documents/document-1/analyze")

    assert response.status_code == 404


def test_assign_document_writes_audit_event():
    client, database = build_document_client(user_with_role("Admin"))

    response = client.post(
        "/api/documents/document-1/assign",
        json={"assigned_to_id": "advisor-1"},
    )

    assert response.status_code == 200
    assert database.auditlog.created[-1] == {
        "user_id": "admin-1",
        "action": "ASSIGN_MSA",
        "target_type": "Document",
        "target_id": "document-1",
    }
