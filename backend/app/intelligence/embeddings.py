"""
Intelligence Layer — Clause Embedding Generation.

Generates vector embeddings for legal clauses so they can be stored
in ChromaDB and retrieved by semantic similarity.

Public API:
    embed_clauses(clauses) → list[EmbeddedClause]
"""

from __future__ import annotations

import logging
from typing import Any

from .types import EmbeddedClause

logger = logging.getLogger(__name__)


def embed_clauses(
    clauses: list[dict[str, Any]],
) -> list[EmbeddedClause]:
    """
    Convert raw clause dicts (from Vinayak's pipeline) into EmbeddedClause
    objects ready for vector store insertion.

    The actual embedding computation is handled by ChromaDB's default
    embedding function (all-MiniLM-L6-v2) at insertion time.  This module
    prepares the metadata and text payloads.

    Args:
        clauses: List of clause dicts with at minimum {id, text, documentId,
                 documentName, documentType}.

    Returns:
        List of EmbeddedClause objects.
    """
    embedded: list[EmbeddedClause] = []

    for clause in clauses:
        text = clause.get("text", "").strip()
        if not text:
            logger.debug("Skipping clause %s — empty text", clause.get("id"))
            continue

        embedded.append(
            EmbeddedClause(
                clause_id=clause["id"],
                document_id=clause.get("documentId", ""),
                document_name=clause.get("documentName", ""),
                document_type=clause.get("documentType", ""),
                clause_type=clause.get("clauseType"),
                section_number=clause.get("sectionNumber"),
                text=text,
            )
        )

    logger.info("Prepared %d clauses for embedding", len(embedded))
    return embedded


def build_embedding_text(clause: EmbeddedClause) -> str:
    """
    Build the text string that will be embedded.

    Prepends clause metadata so the embedding captures context
    (e.g. "payment clause from MSA" clusters differently from
    "payment clause from SOW").
    """
    parts: list[str] = []

    if clause.clause_type:
        parts.append(f"[{clause.clause_type.upper()}]")
    if clause.document_type:
        parts.append(f"[{clause.document_type}]")
    if clause.section_number:
        parts.append(f"Section {clause.section_number}:")

    parts.append(clause.text[:1000])  # cap to avoid token overflow

    return " ".join(parts)
