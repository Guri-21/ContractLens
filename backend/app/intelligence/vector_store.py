"""
Intelligence Layer — pgvector Vector Store (Supabase).

Uses Jina AI embeddings (1024-dim) stored in Supabase PostgreSQL with the
pgvector extension. Cosine similarity search via the <=> operator.

Required env vars:
    DATABASE_URL  — Supabase transaction pooler URL (port 6543)
    JINA_API_KEY  — free key from jina.ai
"""

from __future__ import annotations

import logging
import os
from typing import Any, Optional

from .embeddings import EmbeddedClause, build_embedding_text

logger = logging.getLogger(__name__)

_TABLE = "contract_clauses"
_store_instance: Optional["VectorStore"] = None


def _get_conn():
    import psycopg2  # type: ignore[import]

    url = os.getenv("DATABASE_URL", "")
    if not url:
        raise RuntimeError("DATABASE_URL env var is not set")
    if "sslmode" not in url:
        sep = "&" if "?" in url else "?"
        url = f"{url}{sep}sslmode=require"
    return psycopg2.connect(url)


def _vec_literal(embedding: list[float]) -> str:
    return "[" + ",".join(f"{v:.8f}" for v in embedding) + "]"


class VectorStore:
    """
    pgvector-backed clause store using Supabase PostgreSQL.

    Embeddings are generated via Jina AI REST API and stored as
    vector(1024) columns. Persists across Render restarts (DB is external).
    """

    # ── Write ────────────────────────────────────────────────────

    def add_clauses(self, clauses: list[EmbeddedClause]) -> int:
        if not clauses:
            return 0

        from .jina_embeddings import embed_texts

        texts = [build_embedding_text(c) for c in clauses]
        embeddings = embed_texts(texts)

        conn = _get_conn()
        try:
            with conn:
                with conn.cursor() as cur:
                    rows = [
                        (
                            c.embedding_id,
                            c.clause_id,
                            c.document_id,
                            c.document_name,
                            c.document_type,
                            c.clause_type or "unknown",
                            c.section_number or "",
                            c.text[:500],
                            _vec_literal(e),
                        )
                        for c, e in zip(clauses, embeddings)
                    ]
                    cur.executemany(
                        f"""
                        INSERT INTO {_TABLE}
                            (embedding_id, clause_id, document_id, document_name,
                             document_type, clause_type, section_number, text, embedding)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::vector)
                        ON CONFLICT (embedding_id) DO UPDATE SET
                            text      = EXCLUDED.text,
                            embedding = EXCLUDED.embedding
                        """,
                        rows,
                    )
            logger.info("Upserted %d clauses to pgvector", len(clauses))
        finally:
            conn.close()

        return len(clauses)

    # ── Read ─────────────────────────────────────────────────────

    def search(
        self,
        query_text: str,
        n_results: int = 5,
        where_filter: Optional[dict[str, Any]] = None,
        exclude_document_id: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        from .jina_embeddings import embed_one

        query_vec = embed_one(query_text)
        vec_str = _vec_literal(query_vec)

        # Build optional WHERE clause
        conditions: list[str] = []
        params: list[Any] = [vec_str, vec_str]
        if exclude_document_id:
            conditions.append("document_id != %s")
            params.append(exclude_document_id)
        # where_filter keys map directly to column names for simple equality
        if where_filter:
            for col, val in where_filter.items():
                conditions.append(f"{col} = %s")
                params.append(val)
        params.append(n_results)

        where_sql = ("WHERE " + " AND ".join(conditions)) if conditions else ""

        conn = _get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT clause_id, document_id, document_name, document_type,
                           clause_type, section_number, text,
                           1 - (embedding <=> %s::vector) AS similarity_score
                    FROM {_TABLE}
                    {where_sql}
                    ORDER BY embedding <=> %s::vector
                    LIMIT %s
                    """,
                    params,
                )
                rows = cur.fetchall()
        finally:
            conn.close()

        matches: list[dict[str, Any]] = []
        for row in rows:
            (clause_id, document_id, document_name, document_type,
             clause_type, section_number, text, score) = row
            matches.append({
                "clause_id": clause_id,
                "document_id": document_id,
                "document_name": document_name,
                "document_type": document_type,
                "clause_type": clause_type,
                "section_number": section_number,
                "text": text,
                "similarity_score": round(float(score), 4),
            })
        return matches

    # ── Management ───────────────────────────────────────────────

    def count(self) -> int:
        conn = _get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(f"SELECT COUNT(*) FROM {_TABLE}")
                return cur.fetchone()[0]
        finally:
            conn.close()

    def delete_collection(self) -> None:
        conn = _get_conn()
        try:
            with conn:
                with conn.cursor() as cur:
                    cur.execute(f"DELETE FROM {_TABLE}")
        finally:
            conn.close()
        logger.warning("pgvector table '%s' cleared", _TABLE)


def get_store() -> VectorStore:
    global _store_instance
    if _store_instance is None:
        _store_instance = VectorStore()
    return _store_instance
