"""
ContractLens Intelligence Layer
================================

The brain of ContractLens — adds semantic memory, knowledge graphs,
and cross-contract intelligence on top of the base analysis pipeline.

Usage:
    from app.intelligence import analyze_with_intelligence

    result = analyze_with_intelligence(
        documents=[{"id": "d1", "name": "MSA.pdf", "type": "MSA", "file_path": "/path/to/file"}],
        playbook_rules=["Payment terms must not exceed 30 days"],
        country_code="IN",
    )

    # result.pipeline_result   → Vinayak's base analysis
    # result.retrieval_results → similar clauses from past contracts
    # result.clause_graph      → knowledge graph with cycles
    # result.similar_contracts_summary → Claude insights
"""

from .enhanced_pipeline import analyze_with_intelligence
from .retriever import retrieve_similar, search_by_query
from .knowledge_graph import build_graph
from .embeddings import embed_clauses
from .vector_store import get_store
from .types import (
    EnhancedAnalysisResult,
    RetrievalResult,
    SimilarClause,
    ClauseGraph,
    GraphNode,
    GraphEdge,
    EmbeddedClause,
)

__all__ = [
    # Main entry point
    "analyze_with_intelligence",
    # Retrieval
    "retrieve_similar",
    "search_by_query",
    # Graph
    "build_graph",
    # Embeddings
    "embed_clauses",
    "get_store",
    # Types
    "EnhancedAnalysisResult",
    "RetrievalResult",
    "SimilarClause",
    "ClauseGraph",
    "GraphNode",
    "GraphEdge",
    "EmbeddedClause",
]
