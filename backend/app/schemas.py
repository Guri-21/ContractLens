from pydantic import BaseModel
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
