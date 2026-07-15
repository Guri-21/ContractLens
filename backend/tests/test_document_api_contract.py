from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.api.analyze import AnalyzeRequest, validate_analysis_request_documents
from app.api.documents import ADMIN_UPLOAD_DOCUMENT_TYPE, normalize_reviewer_upload_type


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
