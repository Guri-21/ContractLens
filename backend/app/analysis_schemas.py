from datetime import datetime
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.schemas import ClauseDTO, RiskFindingDTO


class AnalysisMode(str, Enum):
    FAST = "fast"
    DEEP = "deep"


class AnalysisJobState(str, Enum):
    QUEUED = "queued"
    EXTRACTING = "extracting"
    AWAITING_ANALYSIS = "awaiting_analysis"
    ANALYZING = "analyzing"
    COMPLETED = "completed"
    COMPLETED_WITH_WARNINGS = "completed_with_warnings"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ClauseWorkState(str, Enum):
    EXTRACTED = "extracted"
    CLASSIFIED = "classified"
    CHECKING = "checking"
    COMPLETED = "completed"
    COMPLETED_WITH_FINDINGS = "completed_with_findings"
    NOT_EVALUATED = "not_evaluated"
    NEEDS_RETRY = "needs_retry"


AnalysisEventType = Literal[
    "job.state",
    "progress",
    "clause.extracted",
    "clause.updated",
    "finding.created",
    "finding.updated",
    "report.ready",
    "warning",
    "job.completed",
    "job.failed",
]


class AnalysisEvent(BaseModel):
    analysisId: str
    sequence: int
    timestamp: datetime
    type: AnalysisEventType
    payload: dict[str, Any]


class AnalysisProgress(BaseModel):
    phase: Literal["extraction", "analysis"]
    stage: str
    completed: int = Field(ge=0)
    total: int | None = Field(default=None, ge=0)


class AnalysisJobSnapshot(BaseModel):
    id: str
    userId: str
    documentIds: list[str]
    playbookId: str | None = None
    jurisdiction: str
    state: AnalysisJobState = AnalysisJobState.QUEUED
    mode: AnalysisMode | None = None
    clauses: list[ClauseDTO] = Field(default_factory=list)
    findings: list[RiskFindingDTO] = Field(default_factory=list)
    report: dict[str, Any] | None = None
    clauseStates: dict[str, ClauseWorkState] = Field(default_factory=dict)
    extractionProgress: AnalysisProgress | None = None
    analysisProgress: AnalysisProgress | None = None
    warnings: list[dict[str, Any]] = Field(default_factory=list)
    lastSequence: int = 0
    createdAt: datetime
    updatedAt: datetime


class CreateAnalysisJobRequest(BaseModel):
    documentIds: list[str] = Field(min_length=1)
    playbookId: str | None = None
    jurisdiction: str


class CreateAnalysisJobResponse(BaseModel):
    analysisId: str


class StartAnalysisJobRequest(BaseModel):
    mode: AnalysisMode


class RetryAnalysisJobRequest(BaseModel):
    clauseIds: list[str] = Field(min_length=1)
