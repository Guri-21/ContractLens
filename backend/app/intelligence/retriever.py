"""
Intelligence Layer — Semantic Clause Retriever.

Finds semantically similar clauses across contracts using
the ChromaDB vector store.

Public API:
    retrieve_similar(clauses, top_k) → list[RetrievalResult]
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from .embeddings import build_embedding_text, EmbeddedClause
from .types import RetrievalResult, SimilarClause, SimilaritySource
from .vector_store import get_store

logger = logging.getLogger(__name__)


def retrieve_similar(
    clauses: list[dict[str, Any]],
    top_k: int = 5,
    min_score: float = 0.3,
    cross_contract_only: bool = True,
) -> list[RetrievalResult]:
    """
    For each input clause, find the most similar clauses from the
    vector store (i.e. from previously analyzed contracts).

    Args:
        clauses: Clause dicts from the pipeline (must have id, text,
                 documentId, documentName, documentType).
        top_k: Maximum similar clauses to return per query clause.
        min_score: Minimum cosine similarity threshold (0-1).
        cross_contract_only: If True, excludes matches from the same
                             document (so you only see cross-contract hits).

    Returns:
        List of RetrievalResult, one per input clause that had matches.
    """
    store = get_store()

    if store.count() == 0:
        logger.info("Vector store is empty — skipping retrieval")
        return []

    results: list[RetrievalResult] = []

    for clause in clauses:
        text = clause.get("text", "").strip()
        if not text:
            continue

        # Build enriched query text (same format as stored embeddings)
        query_clause = EmbeddedClause(
            clause_id=clause["id"],
            document_id=clause.get("documentId", ""),
            document_name=clause.get("documentName", ""),
            document_type=clause.get("documentType", ""),
            clause_type=clause.get("clauseType"),
            section_number=clause.get("sectionNumber"),
            text=text,
        )
        query_text = build_embedding_text(query_clause)

        # Search vector store
        exclude_doc = clause.get("documentId") if cross_contract_only else None
        raw_matches = store.search(
            query_text=query_text,
            n_results=top_k,
            exclude_document_id=exclude_doc,
        )

        # Filter by minimum score and convert to typed models
        similar: list[SimilarClause] = []
        for match in raw_matches:
            score = match.get("similarity_score", 0.0)
            if score < min_score:
                continue

            # Determine source
            source = SimilaritySource.PAST_CONTRACT
            if match.get("document_id") == clause.get("documentId"):
                source = SimilaritySource.SAME_CONTRACT

            similar.append(
                SimilarClause(
                    clause_id=match["clause_id"],
                    document_id=match["document_id"],
                    document_name=match["document_name"],
                    document_type=match["document_type"],
                    clause_type=match.get("clause_type"),
                    section_number=match.get("section_number"),
                    text=match.get("text", ""),
                    similarity_score=score,
                    source=source,
                )
            )

        if similar:
            results.append(
                RetrievalResult(
                    query_clause_id=clause["id"],
                    query_text=text[:200],
                    similar_clauses=similar,
                    total_searched=store.count(),
                )
            )

    logger.info(
        "Retrieval complete: %d/%d clauses had similar matches",
        len(results),
        len(clauses),
    )
    return results


def search_by_query(
    query: str,
    top_k: int = 10,
    clause_type_filter: Optional[str] = None,
) -> list[SimilarClause]:
    """
    Free-text semantic search across all stored clauses.

    Useful for ad-hoc queries like:
        "Find all payment terms over 30 days"
        "Show me indemnification clauses with unlimited liability"

    Args:
        query: Natural language search query.
        top_k: Maximum results.
        clause_type_filter: Optional filter by clause type.

    Returns:
        List of matching SimilarClause objects.
    """
    store = get_store()

    where_filter = None
    if clause_type_filter:
        where_filter = {"clause_type": clause_type_filter}

    raw = store.search(
        query_text=query,
        n_results=top_k,
        where_filter=where_filter,
    )

    return [
        SimilarClause(
            clause_id=m["clause_id"],
            document_id=m["document_id"],
            document_name=m["document_name"],
            document_type=m["document_type"],
            clause_type=m.get("clause_type"),
            section_number=m.get("section_number"),
            text=m.get("text", ""),
            similarity_score=m.get("similarity_score", 0.0),
            source=SimilaritySource.PAST_CONTRACT,
        )
        for m in raw
    ]
