from types import SimpleNamespace

import pytest

from app.document_workflow import (
    REVIEWER_UPLOAD_TYPES,
    SUPPORTING_DOCUMENT_TYPES,
    validate_analysis_package,
    validate_reviewer_upload_type,
)
from app.schemas import ClauseDTO


def document(document_id, document_type):
    return SimpleNamespace(id=document_id, document_type=document_type)


@pytest.mark.parametrize(
    "document_type",
    ["NDA", "SLA", "EXHIBIT", "AMENDMENT", "ORDER_FORM", "DPA", "OTHER"],
)
def test_reviewer_accepts_each_supporting_document_type(document_type):
    assert document_type in SUPPORTING_DOCUMENT_TYPES
    assert validate_reviewer_upload_type(document_type) == document_type


@pytest.mark.parametrize("document_type", ["MSA", "PLAYBOOK", "LAW"])
def test_reviewer_rejects_protected_document_types(document_type):
    with pytest.raises(ValueError, match="Legal Reviewers cannot upload"):
        validate_reviewer_upload_type(document_type)


def test_reviewer_upload_types_include_sow_and_all_supporting_types():
    assert REVIEWER_UPLOAD_TYPES == SUPPORTING_DOCUMENT_TYPES | {"SOW"}


@pytest.mark.parametrize(
    ("documents", "msa_id", "sow_id", "error"),
    [
        (
            [document("msa", "SOW"), document("sow", "SOW")],
            "msa",
            "sow",
            "MSA document must have type MSA",
        ),
        (
            [document("msa", "MSA"), document("sow", "NDA")],
            "msa",
            "sow",
            "SOW document must have type SOW",
        ),
    ],
)
def test_analysis_package_requires_primary_document_types(
    documents, msa_id, sow_id, error
):
    with pytest.raises(ValueError, match=error):
        validate_analysis_package(documents, msa_id, sow_id, [])


def test_analysis_package_rejects_duplicate_ids_across_roles():
    documents = [document("msa", "MSA"), document("sow", "SOW")]

    with pytest.raises(ValueError, match="unique"):
        validate_analysis_package(documents, "msa", "sow", ["msa"])


def test_analysis_package_orders_primary_documents_before_supporting_documents():
    msa = document("msa", "MSA")
    sow = document("sow", "SOW")
    exhibit = document("exhibit", "EXHIBIT")
    nda = document("nda", "NDA")

    result = validate_analysis_package(
        [exhibit, sow, nda, msa], "msa", "sow", ["nda", "exhibit"]
    )

    assert [item.id for item in result] == ["msa", "sow", "nda", "exhibit"]


@pytest.mark.parametrize("document_type", ["AMENDMENT", "ORDER_FORM", "DPA"])
def test_clause_dto_accepts_extended_document_types(document_type):
    clause = ClauseDTO(
        id="clause-1",
        documentId="document-1",
        documentName="Supporting document",
        documentType=document_type,
        text="Contract text",
    )

    assert clause.documentType == document_type
