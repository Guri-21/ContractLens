import os
import shutil
from pathlib import Path

backend = Path(r"d:\Projects\ContractLens\backend")
backend.mkdir(parents=True, exist_ok=True)

dirs = [
    "api", "db", "parser", "agents", "risk", "graph", "redline",
    "demo", "legal_corpus", "scripts/benchmark", "mock"
]

for d in dirs:
    (backend / d).mkdir(parents=True, exist_ok=True)

def create_file(path, content):
    (backend / path).write_text(content, encoding='utf-8')

def stub(path, owner, task):
    create_file(path, f"# TODO: {owner} - {task}\n")

# Core files
create_file("requirements.txt", "fastapi\nuvicorn\npydantic\nsqlalchemy\n")
create_file(".env.example", "")
create_file("main.py", "# TODO: Person 1 - FastAPI app entrypoint\n")
create_file("database.py", "# TODO: Person 1 - SQLAlchemy engine/session setup\n")
create_file("models.py", "# TODO: Person 1 - SQLAlchemy models (Document, Clause, Risk, etc.)\n")

schemas_content = """from typing import List, Optional, Any
from pydantic import BaseModel
from enum import Enum

class DocumentType(str, Enum):
    MSA = "MSA"
    SOW = "SOW"
    SLA = "SLA"
    NDA = "NDA"
    EXHIBIT = "EXHIBIT"
    PLAYBOOK = "PLAYBOOK"
    LAW = "LAW"

class RiskLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"

class EvaluationStatus(str, Enum):
    evaluated = "evaluated"
    not_evaluated = "not_evaluated"

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
    references: List[str]
    overrides: List[str]
    tableData: Optional[Any] = None

class Redline(BaseModel):
    originalText: str
    suggestedText: str
    diffHtml: Optional[str] = None

class Evidence(BaseModel):
    documentName: str
    page: Optional[int] = None
    section: Optional[str] = None
    quote: str

class RiskFindingDTO(BaseModel):
    id: str
    clauseId: str
    riskLevel: RiskLevel
    status: EvaluationStatus
    reason: str
    playbookRuleViolated: Optional[str] = None
    evidence: List[Evidence]
    missingDocuments: Optional[List[str]] = None
    redline: Optional[Redline] = None
"""
create_file("schemas.py", schemas_content)

modules = [
    "api", "db", "parser", "agents", "risk", "graph", "redline",
    "demo", "legal_corpus", "scripts", "scripts/benchmark", "mock"
]
for m in modules:
    create_file(f"{m}/__init__.py", "")

# API routes
stub("api/documents_route.py", "Person 1", "documents route")
stub("api/parse_route.py", "Person 1", "parse route")
stub("api/analyze_route.py", "Person 3", "analyze route")
stub("api/playbook_route.py", "Person 1", "playbook route")
stub("api/audit_route.py", "Person 1", "audit route")

# Database repos
stub("db/documents_repo.py", "Person 1", "documents repo")
stub("db/clauses_repo.py", "Person 1", "clauses repo")
stub("db/risks_repo.py", "Person 1", "risks repo")
stub("db/audit_repo.py", "Person 1", "audit repo")

# Parser
stub("parser/types.py", "Person 2", "parser types")
stub("parser/extract_text.py", "Person 2", "extract text")
stub("parser/extract_clauses.py", "Person 2", "extract clauses")
stub("parser/extract_tables.py", "Person 2", "extract tables")
stub("parser/extract_references.py", "Person 2", "extract references")

# Agents
stub("agents/classify_clause.py", "Person 3", "classify clause")
stub("agents/playbook_check.py", "Person 3", "playbook check")
stub("agents/legal_grounding.py", "Person 3", "legal grounding")

# Risk
stub("risk/detect_contradictions.py", "Person 3", "detect contradictions")
stub("risk/refusal_engine.py", "Person 3", "refusal engine")
stub("risk/risk_score.py", "Person 3", "risk score")

# Graph
stub("graph/build_dependency_graph.py", "Person 3", "build dependency graph")
stub("graph/detect_cycles.py", "Person 3", "detect cycles")

# Redline
stub("redline/generate_redline.py", "Person 3", "generate redline")
stub("redline/diff_words.py", "Person 3", "diff words")

# Demo & Legal
stub("demo/demo_scenarios.py", "Person 5", "demo scenarios")
stub("legal_corpus/india_acts_index.py", "Person 5", "india acts index")

# Scripts
stub("scripts/benchmark/run_clause_benchmark.py", "Person 5", "run clause benchmark")
stub("scripts/benchmark/run_refusal_benchmark.py", "Person 5", "run refusal benchmark")
stub("scripts/benchmark/run_risk_benchmark.py", "Person 5", "run risk benchmark")
stub("scripts/seed_demo.py", "Person 5", "seed demo")
stub("scripts/extract_cuad_samples.py", "Person 5", "extract cuad samples")

# Mock
stub("mock/demo_msa.py", "Person 5", "demo msa")
stub("mock/demo_sow.py", "Person 5", "demo sow")
stub("mock/demo_exhibit_a.py", "Person 5", "demo exhibit a")
stub("mock/sample_analysis.py", "Person 5", "sample analysis")
stub("mock/sample_risks.py", "Person 5", "sample risks")
