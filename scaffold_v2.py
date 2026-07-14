import os
import shutil
from pathlib import Path

backend = Path(r"d:\Projects\ContractLens\backend")
if backend.exists():
    shutil.rmtree(backend)
backend.mkdir(parents=True, exist_ok=True)

dirs = [
    "app/models",
    "app/api",
    "app/db",
    "app/parser",
    "app/agents",
    "app/risk",
    "app/graph",
    "demo",
    "legal_corpus",
    "mock",
    "scripts/benchmark",
    "alembic/versions"
]

for d in dirs:
    (backend / d).mkdir(parents=True, exist_ok=True)

def create_file(path, content):
    (backend / path).write_text(content, encoding='utf-8')

def stub(path, owner, task):
    module = path.split('/')[-1] if '/' in path else path
    create_file(path, f"# Owner: {owner} — {module}\n# TODO: {task}\n")

# requirements.txt
create_file("requirements.txt", "fastapi\nuvicorn[standard]\nsqlalchemy\npydantic\npython-multipart\npdfplumber\nPyMuPDF\npython-docx\nanthropic\npython-dotenv\nalembic\n")

# .env.example
create_file(".env.example", "DATABASE_URL=\nANTHROPIC_API_KEY=\n")

# main.py
main_content = """# Owner: Person 1 — main.py
# TODO: FastAPI app entrypoint, mounts all routers, CORS config for frontend origin
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import documents, analyze

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router)
app.include_router(analyze.router)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
"""
create_file("main.py", main_content)

# app init files
create_file("app/__init__.py", "")
create_file("app/models/__init__.py", "")
create_file("app/api/__init__.py", "")
create_file("app/db/__init__.py", "")
create_file("app/parser/__init__.py", "")
create_file("app/agents/__init__.py", "")
create_file("app/risk/__init__.py", "")
create_file("app/graph/__init__.py", "")
create_file("demo/__init__.py", "")
create_file("legal_corpus/__init__.py", "")
create_file("mock/__init__.py", "")

# database.py
stub("app/database.py", "Person 1", "SQLAlchemy engine + session + Base")

# schemas.py
schemas_content = """from pydantic import BaseModel
from typing import Optional, List, Literal, Any

DocumentType = Literal["MSA", "SOW", "SLA", "NDA", "EXHIBIT", "PLAYBOOK", "LAW"]
RiskLevel = Literal["low", "medium", "high", "critical"]
EvaluationStatus = Literal["evaluated", "not_evaluated"]

class ClauseDTO(BaseModel):
    id: str
    documentId: str
    documentName: str
    documentType: DocumentType
    sectionNumber: Optional[str] = None
    title: Optional[str] = None
    page: Optional[int] = None
    text: str
    clauseType: Optional[str] = None
    references: List[str] = []
    overrides: List[str] = []
    tableData: Optional[Any] = None

class Evidence(BaseModel):
    documentName: str
    page: Optional[int] = None
    section: Optional[str] = None
    quote: str

class Redline(BaseModel):
    originalText: str
    suggestedText: str
    diffHtml: Optional[str] = None

class RiskFindingDTO(BaseModel):
    id: str
    clauseId: str
    riskLevel: RiskLevel
    status: EvaluationStatus
    reason: str
    playbookRuleViolated: Optional[str] = None
    evidence: List[Evidence] = []
    missingDocuments: Optional[List[str]] = None
    redline: Optional[Redline] = None
"""
create_file("app/schemas.py", schemas_content)

# app/models/
stub("app/models/document.py", "Person 1", "Document table")
stub("app/models/clause.py", "Person 1", "Clause table")
stub("app/models/risk.py", "Person 1", "RiskFinding table")
stub("app/models/redline.py", "Person 1", "RedlineSuggestion table")
stub("app/models/audit.py", "Person 1", "AuditLog table")
stub("app/models/playbook.py", "Person 1", "PlaybookRule table")
stub("app/models/legal_source.py", "Person 1", "LegalSource table")

# app/api/
documents_api = """# Owner: Person 1 — documents.py
# TODO: POST/GET /api/documents
from fastapi import APIRouter
from mock.sample_analysis import sample_clauses

router = APIRouter(prefix="/api/documents", tags=["documents"])

@router.get("")
def get_documents():
    return sample_clauses
"""
create_file("app/api/documents.py", documents_api)

stub("app/api/parse.py", "Person 2", "POST /api/parse")

analyze_api = """# Owner: Person 3 — analyze.py
# TODO: POST /api/analyze
from fastapi import APIRouter
from mock.sample_risks import sample_risks_data

router = APIRouter(prefix="/api/analyze", tags=["analyze"])

@router.get("")
def get_analyze():
    return sample_risks_data
"""
create_file("app/api/analyze.py", analyze_api)

stub("app/api/playbook.py", "Person 1", "CRUD /api/playbook")
stub("app/api/audit.py", "Person 1", "GET /api/audit")

# app/db/
stub("app/db/documents_repo.py", "Person 1", "documents repo")
stub("app/db/clauses_repo.py", "Person 1", "clauses repo")
stub("app/db/risks_repo.py", "Person 1", "risks repo")
stub("app/db/audit_repo.py", "Person 1", "audit repo")

# app/parser/
stub("app/parser/types.py", "Person 2", "ParsedDocument, ParsedClause dataclasses/pydantic models")
stub("app/parser/extract_text.py", "Person 2", "pdfplumber/PyMuPDF text extraction")
stub("app/parser/extract_clauses.py", "Person 2", "regex section-number segmentation + LLM cleanup call")
stub("app/parser/extract_tables.py", "Person 2", "table extraction, preserved as JSON")
stub("app/parser/extract_references.py", "Person 2", "detect 'Section 5', 'Exhibit B', 'Schedule A' etc.")
stub("app/parser/index.py", "Person 2", "orchestrates the above into one ParsedDocument")

# app/agents/
stub("app/agents/classify_clause.py", "Person 3", "clause type + risk-relevant tagging")
stub("app/agents/playbook_check.py", "Person 3", "validates clause against active playbook rules")
stub("app/agents/country_compliance.py", "Person 3", "validates clause against selected jurisdiction rules")
stub("app/agents/legal_grounding.py", "Person 3", "cites CUAD/LEDGAR-style reasoning without fine-tuning")
stub("app/agents/redline_agent.py", "Person 3", "generates original/suggested text pairs")
stub("app/agents/report_agent.py", "Person 3", "generates executive summary + structured report")

# app/risk/
stub("app/risk/detect_contradictions.py", "Person 3", "cross-document contradiction detection (MSA vs SOW)")
stub("app/risk/refusal_engine.py", "Person 3", "marks findings not_evaluated when referenced doc is missing")
stub("app/risk/risk_score.py", "Person 3", "aggregates findings into overall risk score")

# app/graph/
stub("app/graph/build_dependency_graph.py", "Person 3", "assembles {clause_id, references, overrides} from agent output")
stub("app/graph/detect_cycles.py", "Person 3", "simple cycle detection over the graph JSON")

# demo/
stub("demo/demo_scenarios.py", "Person 5", "named demo walkthroughs (payment conflict, missing exhibit, etc.)")

# legal_corpus/
stub("legal_corpus/india_acts_index.py", "Person 5", "reference index used for 'informed by' grounding, not training")

# mock/
stub("mock/demo_msa.py", "Person 5", "demo_msa")
stub("mock/demo_sow.py", "Person 5", "demo_sow")
stub("mock/demo_exhibit_a.py", "Person 5", "demo_exhibit_a")

sample_analysis_content = """# mock/sample_analysis.py
sample_clauses = [
    {
        "id": "c1",
        "documentId": "doc1",
        "documentName": "MSA",
        "documentType": "MSA",
        "text": "This is a sample clause."
    }
]
"""
create_file("mock/sample_analysis.py", sample_analysis_content)

sample_risks_content = """# mock/sample_risks.py
sample_risks_data = [
    {
        "id": "r1",
        "clauseId": "c1",
        "riskLevel": "low",
        "status": "evaluated",
        "reason": "Sample reason"
    }
]
"""
create_file("mock/sample_risks.py", sample_risks_content)

# scripts/
stub("scripts/benchmark/run_clause_benchmark.py", "Person 5", "run_clause_benchmark")
stub("scripts/benchmark/run_refusal_benchmark.py", "Person 5", "run_refusal_benchmark")
stub("scripts/benchmark/run_risk_benchmark.py", "Person 5", "run_risk_benchmark")
stub("scripts/seed_demo.py", "Person 5", "loads mock/ data into the DB via SQLAlchemy session")
stub("scripts/extract_cuad_samples.py", "Person 5", "pulls reference examples for prompts, not for training")

# alembic/
stub("alembic/env.py", "Person 1", "migrations (init after schema.py/models are stable)")

print("Scaffold complete.")
