"""
Intelligence Layer — ChromaDB Vector Store (Chroma Cloud).

Uses hybrid search: Qwen dense embeddings + Splade sparse embeddings
fused via Reciprocal Rank Fusion. All embedding is server-side on
Chroma Cloud — zero local ML compute.

Required env vars:
    CHROMA_API_KEY   — from Chroma Cloud dashboard
    CHROMA_TENANT    — your tenant UUID
    CHROMA_DATABASE  — database name (default: Contract_Lens)
    CHROMA_HOST      — (default: api.trychroma.com)
"""

from __future__ import annotations

import logging
import os
from typing import Any, Optional

from .embeddings import EmbeddedClause, build_embedding_text

logger = logging.getLogger(__name__)

_COLLECTION_NAME = "contract_clauses"
_store_instance: Optional["VectorStore"] = None


def _cloud_client():
    import chromadb
    return chromadb.HttpClient(
        host=os.getenv("CHROMA_HOST", "api.trychroma.com"),
        port=443,
        ssl=True,
        tenant=os.getenv("CHROMA_TENANT", ""),
        database=os.getenv("CHROMA_DATABASE", "Contract_Lens"),
        headers={"x-chroma-token": os.getenv("CHROMA_API_KEY", "")},
    )


def _make_embedding_functions():
    from chromadb.utils.embedding_functions import (
        ChromaCloudQwenEmbeddingFunction,
        ChromaCloudSpladeEmbeddingFunction,
    )
    dense_ef = ChromaCloudQwenEmbeddingFunction(
        model="qwen3-embedding-0.6b",
        task="text_matching",
    )
    sparse_ef = ChromaCloudSpladeEmbeddingFunction()
    return dense_ef, sparse_ef


class VectorStore:
    """
    Chroma Cloud wrapper with hybrid dense+sparse search.

    Collections are persistent in Chroma Cloud — survives Render restarts.
    """

    def __init__(self) -> None:
        try:
            from chromadb import Schema, SparseVectorIndexConfig, K
        except ImportError:
            raise ImportError("chromadb is required: pip install 'chromadb[httpx]'")

        self._client = _cloud_client()
        dense_ef, sparse_ef = _make_embedding_functions()
        self._dense_ef = dense_ef

        schema = Schema()
        schema.create_index(
            config=SparseVectorIndexConfig(
                source_key=K.DOCUMENT,
                embedding_function=sparse_ef,
            ),
            key="sparse_embedding",
        )

        self._collection = self._client.get_or_create_collection(
            name=_COLLECTION_NAME,
            embedding_function=dense_ef,
            schema=schema,
        )
        logger.info("Chroma Cloud ready — collection '%s'", _COLLECTION_NAME)

    # ── Write ────────────────────────────────────────────────────

    def add_clauses(self, clauses: list[EmbeddedClause]) -> int:
        if not clauses:
            return 0

        ids, documents, metadatas = [], [], []
        for clause in clauses:
            ids.append(clause.embedding_id)
            documents.append(build_embedding_text(clause))
            metadatas.append({
                "clause_id": clause.clause_id,
                "document_id": clause.document_id,
                "document_name": clause.document_name,
                "document_type": clause.document_type,
                "clause_type": clause.clause_type or "unknown",
                "section_number": clause.section_number or "",
                "text": clause.text[:500],
            })

        self._collection.upsert(ids=ids, documents=documents, metadatas=metadatas)
        logger.info("Upserted %d clauses to Chroma Cloud", len(ids))
        return len(ids)

    # ── Read ─────────────────────────────────────────────────────

    def search(
        self,
        query_text: str,
        n_results: int = 5,
        where_filter: Optional[dict[str, Any]] = None,
        exclude_document_id: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        combined_filter: dict[str, Any] = {}
        if exclude_document_id and where_filter:
            combined_filter = {"$and": [{"document_id": {"$ne": exclude_document_id}}, where_filter]}
        elif exclude_document_id:
            combined_filter = {"document_id": {"$ne": exclude_document_id}}
        elif where_filter:
            combined_filter = where_filter

        try:
            from chromadb import Search, Knn, Rrf
            hybrid = Search(
                query=Rrf(
                    ranks=[
                        Knn(query=query_text, return_rank=True),
                        Knn(query=query_text, key="sparse_embedding", return_rank=True),
                    ],
                    weights=[0.7, 0.3],
                    k=60,
                )
            )
            query_kwargs: dict[str, Any] = {"query": hybrid, "n_results": n_results}
            if combined_filter:
                query_kwargs["where"] = combined_filter
            results = self._collection.query(**query_kwargs)
        except Exception as exc:
            logger.warning("Hybrid search failed (%s) — falling back to dense-only", exc)
            query_kwargs = {"query_texts": [query_text], "n_results": n_results}
            if combined_filter:
                query_kwargs["where"] = combined_filter
            results = self._collection.query(**query_kwargs)

        matches: list[dict[str, Any]] = []
        ids = (results.get("ids") or [[]])[0]
        for i, _id in enumerate(ids):
            meta = ((results.get("metadatas") or [[]])[0] or [{}])[i]
            distance = ((results.get("distances") or [[1.0]])[0] or [1.0])[i]
            matches.append({
                "clause_id": meta.get("clause_id", ""),
                "document_id": meta.get("document_id", ""),
                "document_name": meta.get("document_name", ""),
                "document_type": meta.get("document_type", ""),
                "clause_type": meta.get("clause_type", ""),
                "section_number": meta.get("section_number", ""),
                "text": meta.get("text", ""),
                "similarity_score": round(max(0.0, 1.0 - float(distance)), 4),
            })
        return matches

    # ── Management ───────────────────────────────────────────────

    def count(self) -> int:
        return self._collection.count()

    def delete_collection(self) -> None:
        self._client.delete_collection(_COLLECTION_NAME)
        logger.warning("Chroma Cloud collection '%s' deleted", _COLLECTION_NAME)


def get_store() -> VectorStore:
    global _store_instance
    if _store_instance is None:
        _store_instance = VectorStore()
    return _store_instance
