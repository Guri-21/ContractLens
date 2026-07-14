"""
Intelligence Layer — ChromaDB Vector Store.

Persistent local vector database for clause embeddings.
Supports add, query-by-similarity, and collection management.

Public API:
    get_store()          → VectorStore   (singleton)
    store.add_clauses()  → int           (count added)
    store.search()       → list[dict]    (similar clauses)
    store.delete_collection() → None
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any, Optional

from .embeddings import EmbeddedClause, build_embedding_text

logger = logging.getLogger(__name__)

# ChromaDB storage directory — relative to backend/
_CHROMA_DIR = os.getenv(
    "CHROMA_PERSIST_DIR",
    str(Path(__file__).resolve().parent.parent.parent / "chroma_data"),
)

_COLLECTION_NAME = "contract_clauses"

# Module-level singleton
_store_instance: Optional[VectorStore] = None


class VectorStore:
    """
    Thin wrapper around a ChromaDB collection.

    ChromaDB handles embedding generation internally using
    sentence-transformers (all-MiniLM-L6-v2) by default.
    """

    def __init__(self, persist_dir: str = _CHROMA_DIR) -> None:
        try:
            import chromadb
            from chromadb.config import Settings
        except ImportError:
            raise ImportError(
                "chromadb is required: pip install chromadb"
            )

        self._client = chromadb.PersistentClient(
            path=persist_dir,
            settings=Settings(anonymized_telemetry=False),
        )
        self._collection = self._client.get_or_create_collection(
            name=_COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info(
            "ChromaDB ready — %d existing documents in '%s'",
            self._collection.count(),
            _COLLECTION_NAME,
        )

    # ── Write ────────────────────────────────────────────────────

    def add_clauses(self, clauses: list[EmbeddedClause]) -> int:
        """
        Upsert clauses into the vector store.

        Returns:
            Number of clauses added.
        """
        if not clauses:
            return 0

        ids: list[str] = []
        documents: list[str] = []
        metadatas: list[dict[str, Any]] = []

        for clause in clauses:
            ids.append(clause.embedding_id)
            documents.append(build_embedding_text(clause))
            metadatas.append(
                {
                    "clause_id": clause.clause_id,
                    "document_id": clause.document_id,
                    "document_name": clause.document_name,
                    "document_type": clause.document_type,
                    "clause_type": clause.clause_type or "unknown",
                    "section_number": clause.section_number or "",
                    "text": clause.text[:500],  # store truncated for display
                }
            )

        self._collection.upsert(
            ids=ids,
            documents=documents,
            metadatas=metadatas,
        )

        logger.info("Upserted %d clauses into ChromaDB", len(ids))
        return len(ids)

    # ── Read ─────────────────────────────────────────────────────

    def search(
        self,
        query_text: str,
        n_results: int = 5,
        where_filter: Optional[dict[str, Any]] = None,
        exclude_document_id: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        """
        Find clauses semantically similar to `query_text`.

        Args:
            query_text: The clause text to find matches for.
            n_results: Max number of results.
            where_filter: Optional ChromaDB where clause for metadata filtering.
            exclude_document_id: Exclude results from this document
                                 (useful for cross-contract search).

        Returns:
            List of dicts with keys: clause_id, document_id, document_name,
            document_type, clause_type, text, similarity_score.
        """
        if self._collection.count() == 0:
            return []

        # Build where filter
        combined_filter = where_filter or {}
        if exclude_document_id:
            combined_filter = {
                "$and": [
                    {"document_id": {"$ne": exclude_document_id}},
                    *(
                        [where_filter]
                        if where_filter
                        else []
                    ),
                ]
            } if where_filter else {"document_id": {"$ne": exclude_document_id}}

        query_kwargs: dict[str, Any] = {
            "query_texts": [query_text],
            "n_results": min(n_results, self._collection.count()),
        }
        if combined_filter:
            query_kwargs["where"] = combined_filter

        results = self._collection.query(**query_kwargs)

        # Flatten ChromaDB's nested response format
        matches: list[dict[str, Any]] = []
        if results and results["ids"] and results["ids"][0]:
            for i, _id in enumerate(results["ids"][0]):
                meta = results["metadatas"][0][i] if results["metadatas"] else {}
                distance = results["distances"][0][i] if results["distances"] else 1.0
                # ChromaDB cosine distance → similarity score
                similarity = max(0.0, 1.0 - distance)

                matches.append(
                    {
                        "clause_id": meta.get("clause_id", ""),
                        "document_id": meta.get("document_id", ""),
                        "document_name": meta.get("document_name", ""),
                        "document_type": meta.get("document_type", ""),
                        "clause_type": meta.get("clause_type", ""),
                        "section_number": meta.get("section_number", ""),
                        "text": meta.get("text", ""),
                        "similarity_score": round(similarity, 4),
                    }
                )

        return matches

    # ── Management ───────────────────────────────────────────────

    def count(self) -> int:
        """Return total number of stored clause embeddings."""
        return self._collection.count()

    def delete_collection(self) -> None:
        """Drop the entire collection. Use with caution."""
        self._client.delete_collection(_COLLECTION_NAME)
        self._collection = self._client.get_or_create_collection(
            name=_COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
        logger.warning("ChromaDB collection '%s' deleted", _COLLECTION_NAME)


def get_store(persist_dir: str = _CHROMA_DIR) -> VectorStore:
    """
    Return the module-level VectorStore singleton.

    Lazy-initialized on first call.
    """
    global _store_instance
    if _store_instance is None:
        _store_instance = VectorStore(persist_dir)
    return _store_instance
