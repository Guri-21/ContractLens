from typing import Literal, Sequence


DocumentType = Literal[
    "MSA",
    "SOW",
    "SLA",
    "NDA",
    "EXHIBIT",
    "AMENDMENT",
    "ORDER_FORM",
    "DPA",
    "OTHER",
    "PLAYBOOK",
    "LAW",
]

DOCUMENT_TYPES = {
    "MSA", "SOW", "SLA", "NDA", "EXHIBIT", "AMENDMENT",
    "ORDER_FORM", "DPA", "OTHER", "PLAYBOOK", "LAW",
}
REVIEWER_UPLOAD_TYPES = DOCUMENT_TYPES - {"MSA", "PLAYBOOK", "LAW"}
SUPPORTING_DOCUMENT_TYPES = REVIEWER_UPLOAD_TYPES - {"SOW"}


def validate_reviewer_upload_type(document_type: str) -> str:
    if document_type not in DOCUMENT_TYPES:
        raise ValueError(f"Unsupported document type: {document_type}")
    if document_type not in REVIEWER_UPLOAD_TYPES:
        raise ValueError(f"Legal Reviewers cannot upload {document_type} documents")
    return document_type


def validate_analysis_package(documents, msa_id, sow_id, supporting_ids: Sequence[str]):
    package_ids = [msa_id, sow_id, *supporting_ids]
    if not msa_id or not sow_id:
        raise ValueError("An MSA and SOW document are required for analysis")
    if len(package_ids) != len(set(package_ids)):
        raise ValueError("Analysis document IDs must be unique across package roles")

    documents_by_id = {}
    for document in documents:
        if document.id in documents_by_id:
            raise ValueError(f"Duplicate document ID in analysis package: {document.id}")
        documents_by_id[document.id] = document

    try:
        msa = documents_by_id[msa_id]
        sow = documents_by_id[sow_id]
        supporting_documents = [documents_by_id[document_id] for document_id in supporting_ids]
    except KeyError as error:
        raise ValueError(f"Selected document is unavailable: {error.args[0]}") from None

    if msa.document_type != "MSA":
        raise ValueError("MSA document must have type MSA")
    if sow.document_type != "SOW":
        raise ValueError("SOW document must have type SOW")
    for document in supporting_documents:
        if document.document_type not in SUPPORTING_DOCUMENT_TYPES:
            raise ValueError(
                f"Supporting document {document.id} has invalid type {document.document_type}"
            )

    return [msa, sow, *supporting_documents]
