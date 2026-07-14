# Owner: Person 3 — analyze.py
# TODO: POST /api/analyze
from fastapi import APIRouter
from mock.sample_risks import sample_risks_data

router = APIRouter(prefix="/api/analyze", tags=["analyze"])

@router.get("")
def get_analyze():
    return sample_risks_data
