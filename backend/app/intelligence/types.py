"""
Intelligence Layer — Pydantic models for all intelligence outputs.

These types are the contract between the intelligence layer and the rest
of the system.  Every public function in this package returns one of these.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


# ── Enums ────────────────────────────────────────────────────────

class SimilaritySource(str, Enum):
    """Where a similar-clause match came from."""
    SAME_CONTRACT = "same_contract"
    PAST_CONTRACT = "past_contract"
    LEGAL_CORPUS = "legal_corpus"


class GraphNodeKind(str, Enum):
    DOCUMENT = "document"
    CLAUSE = "clause"


class GraphEdgeKind(str, Enum):
    REFERENCES = "references"
    OVERRIDES = "overrides"
    CONFLICTS_WITH = "conflicts_with"
    PARENT_OF = "parent_of"


# ── Embedding types ──────────────────────────────────────────────

class EmbeddedClause(BaseModel):
    """A clause that has been embedded and stored in the vector DB."""
    clause_id: str
    document_id: str
    document_name: str
    document_type: str
    clause_type: Optional[str] = None
    section_number: Optional[str] = None
    text: str
    embedding_id: str = Field(default_factory=lambda: uuid4().hex)


# ── Retrieval types ──────────────────────────────────────────────

class SimilarClause(BaseModel):
    """A clause retrieved by semantic similarity."""
    clause_id: str
    document_id: str
    document_name: str
    document_type: str
    clause_type: Optional[str] = None
    section_number: Optional[str] = None
    text: str
    similarity_score: float = Field(ge=0.0, le=1.0)
    source: SimilaritySource = SimilaritySource.PAST_CONTRACT


class RetrievalResult(BaseModel):
    """Result of a semantic retrieval query."""
    query_clause_id: str
    query_text: str
    similar_clauses: list[SimilarClause] = []
    total_searched: int = 0


# ── Knowledge Graph types ────────────────────────────────────────

class GraphNode(BaseModel):
    id: str
    kind: GraphNodeKind
    label: str
    metadata: dict[str, Any] = {}


class GraphEdge(BaseModel):
    source_id: str
    target_id: str
    kind: GraphEdgeKind
    label: str = ""
    metadata: dict[str, Any] = {}


class ClauseGraph(BaseModel):
    """Full clause-relationship graph for a contract set."""
    nodes: list[GraphNode] = []
    edges: list[GraphEdge] = []
    cycles: list[list[str]] = []
    stats: dict[str, int] = {}


# ── Enhanced pipeline output ─────────────────────────────────────

class EnhancedAnalysisResult(BaseModel):
    """
    Extends Vinayak's pipeline output with intelligence layer data.
    The `pipeline_result` field holds the raw pipeline dict.
    """
    analysis_id: str = Field(default_factory=lambda: uuid4().hex[:12])
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    # Raw pipeline output (from Vinayak's run_analysis_pipeline)
    pipeline_result: dict[str, Any] = {}

    # Intelligence enrichments
    retrieval_results: list[RetrievalResult] = []
    clause_graph: Optional[ClauseGraph] = None
    similar_contracts_summary: Optional[str] = None

    # Metadata
    documents_analyzed: list[str] = []
    total_clauses_embedded: int = 0
    total_similar_found: int = 0
