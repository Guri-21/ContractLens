from pydantic import BaseModel, Field
from typing import Optional, List, Literal, Any, Dict
from datetime import datetime

DocumentType = Literal["MSA", "SOW", "SLA", "NDA", "EXHIBIT", "PLAYBOOK", "LAW"]
RiskLevel = Literal["low", "medium", "high", "critical"]
EvaluationStatus = Literal["evaluated", "not_evaluated"]

class EntityDTO(BaseModel):
    type: str
    value: str

class ClauseVersionDTO(BaseModel):
    versionNumber: int
    text: str
    editedBy: Optional[str] = None
    editedAt: str
    changeType: Literal["uploaded", "ai_suggestion_accepted", "manual_edit"]

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
    entities: Optional[List[EntityDTO]] = None
    embeddingId: Optional[str] = None
    versionHistory: Optional[List[ClauseVersionDTO]] = None

class Evidence(BaseModel):
    documentName: str
    page: Optional[int] = None
    section: Optional[str] = None
    quote: str

class Redline(BaseModel):
    originalText: str
    suggestedText: str
    diffHtml: Optional[str] = None

class ComparisonText(BaseModel):
    sowText: str
    msaText: str

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
    contradictionType: Optional[Literal["msa_conflict", "playbook_violation", "country_law_violation", "missing_clause"]] = None
    confidence: Optional[float] = None
    comparisonText: Optional[ComparisonText] = None

class MissingMandatoryClauseDTO(BaseModel):
    clauseName: str
    present: bool

class CountryLawComplianceDTO(BaseModel):
    lawName: str
    status: Literal["pass", "warning", "fail"]
    details: Optional[str] = None

class FinancialSummaryDTO(BaseModel):
    contractValue: Optional[str] = None
    penalty: Optional[str] = None
    paymentTerms: Optional[str] = None
    liabilityCap: Optional[str] = None
    warrantyPeriod: Optional[str] = None

class ApprovalDTO(BaseModel):
    status: Literal["pending", "approved", "needs_revision", "rejected"]
    reason: Optional[str] = None
    reviewerNotes: Optional[str] = None
    internalRemarks: Optional[str] = None
    decidedBy: Optional[str] = None
    decidedAt: Optional[str] = None

class NotificationDTO(BaseModel):
    id: str
    type: Literal["analysis_completed", "new_contradiction", "playbook_updated", "ready_for_approval", "reanalysis_completed"]
    message: str
    createdAt: str
    read: bool
    relatedDocumentId: Optional[str] = None
