# Owner: Person 1 — documents.py
# TODO: POST/GET /api/documents
from fastapi import APIRouter
from mock.sample_analysis import sample_clauses

router = APIRouter(prefix="/api/documents", tags=["documents"])

@router.get("")
def get_documents():
    return sample_clauses
