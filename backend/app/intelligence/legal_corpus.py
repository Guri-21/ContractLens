"""
Indian statute extraction and ChromaDB ingestion.

This module keeps statutory law vectors separate from contract clause vectors.
Each stored item is one statutory section with source metadata for citation.
"""

from __future__ import annotations

import hashlib
import logging
import os
import re
from pathlib import Path
from typing import Any, Iterable, Optional

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

_CHROMA_DIR = os.getenv(
    "CHROMA_PERSIST_DIR",
    str(Path(__file__).resolve().parent.parent.parent / "chroma_data"),
)
_INDIAN_STATUTES_COLLECTION = "indian_statutes"
_MAX_EMBED_CHARS = 2500
_MAX_DISPLAY_CHARS = 1000


class StatuteSection(BaseModel):
    """A source-citable section extracted from an Indian law PDF."""

    id: str
    act_name: str
    section_number: str
    section_title: str = ""
    chapter: str = ""
    text: str
    source_pdf: str
    page_number: int
    jurisdiction: str = "India"
    law_type: str = "statute"


def extract_pdf_pages(pdf_path: Path) -> list[dict[str, Any]]:
    """Extract text pages from a statute PDF."""
    try:
        import pdfplumber
    except ImportError as exc:
        raise ImportError("pdfplumber is required to ingest Indian law PDFs") from exc

    pages: list[dict[str, Any]] = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        for index, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            if text.strip():
                pages.append({"page": index, "text": text, "tables": []})
    return pages


def extract_statute_sections_from_pages(
    pages: Iterable[dict[str, Any]],
    source_pdf: str,
) -> list[StatuteSection]:
    """
    Split extracted statute pages into section-level records.

    The splitter is deterministic and keeps sub-sections inside their parent
    section so the model receives the complete statutory context.
    """
    prepared_pages = [
        {
            "page": int(page.get("page", 1)),
            "text": _normalize_text(str(page.get("text", ""))),
        }
        for page in pages
        if str(page.get("text", "")).strip()
    ]
    if not prepared_pages:
        return []

    combined_text, page_offsets = _combine_pages(prepared_pages)
    act_name = _extract_act_name(combined_text, source_pdf)
    chapter_markers = _extract_chapter_markers(combined_text)
    section_matches = list(_iter_section_matches(combined_text))

    sections: list[StatuteSection] = []
    for index, match in enumerate(section_matches):
        start = match.start("number")
        body_start = match.end()
        end = (
            section_matches[index + 1].start()
            if index + 1 < len(section_matches)
            else len(combined_text)
        )
        raw_body = combined_text[body_start:end].strip()
        body = _cleanup_section_text(raw_body)
        if not body:
            continue

        section_number = match.group("number").strip()
        title = _cleanup_title(match.group("title"))
        page_number = _page_for_offset(start, page_offsets)
        chapter = _chapter_for_offset(start, chapter_markers)
        section_id = _stable_section_id(
            act_name=act_name,
            section_number=section_number,
            source_pdf=Path(source_pdf).name,
            start_offset=start,
        )

        sections.append(
            StatuteSection(
                id=section_id,
                act_name=act_name,
                section_number=section_number,
                section_title=title,
                chapter=chapter,
                text=body,
                source_pdf=Path(source_pdf).name,
                page_number=page_number,
            )
        )

    return sections


def extract_statute_sections_from_pdf(pdf_path: Path) -> list[StatuteSection]:
    """Extract section-level statute records from one PDF file."""
    return extract_statute_sections_from_pages(
        extract_pdf_pages(pdf_path),
        source_pdf=pdf_path.name,
    )


def build_statute_embedding_text(section: StatuteSection) -> str:
    """Build the exact text payload embedded into ChromaDB."""
    title = f": {section.section_title}" if section.section_title else ""
    chapter = f" {section.chapter}" if section.chapter else ""
    return (
        f"[STATUTE] [{section.jurisdiction}] {section.act_name}{chapter} "
        f"Section {section.section_number}{title}. "
        f"{section.text[:_MAX_EMBED_CHARS]}"
    ).strip()


def ingest_indian_law_pdfs(
    laws_dir: Path,
    persist_dir: str = _CHROMA_DIR,
) -> dict[str, Any]:
    """
    Extract all Indian law PDFs in `laws_dir` and upsert them into ChromaDB.

    Returns a small summary suitable for CLI output and tests.
    """
    sections: list[StatuteSection] = []
    pdfs = sorted(laws_dir.glob("*.pdf"))
    for pdf in pdfs:
        extracted = extract_statute_sections_from_pdf(pdf)
        logger.info("Extracted %d sections from %s", len(extracted), pdf.name)
        sections.extend(extracted)

    stored = upsert_statute_sections(
        sections,
        persist_dir=persist_dir,
        replace_collection=True,
    )
    return {
        "pdf_count": len(pdfs),
        "section_count": len(sections),
        "stored_count": stored,
        "collection": _INDIAN_STATUTES_COLLECTION,
        "persist_dir": persist_dir,
    }


def upsert_statute_sections(
    sections: list[StatuteSection],
    persist_dir: str = _CHROMA_DIR,
    replace_collection: bool = False,
) -> int:
    """Upsert statute sections into the `indian_statutes` Chroma collection."""
    if not sections:
        return 0

    try:
        import chromadb
        from chromadb.config import Settings
    except ImportError as exc:
        raise ImportError("chromadb is required: pip install chromadb") from exc

    client = chromadb.PersistentClient(
        path=persist_dir,
        settings=Settings(anonymized_telemetry=False),
    )
    if replace_collection:
        try:
            client.delete_collection(_INDIAN_STATUTES_COLLECTION)
        except ValueError:
            pass

    collection = client.get_or_create_collection(
        name=_INDIAN_STATUTES_COLLECTION,
        metadata={"hnsw:space": "cosine"},
    )

    collection.upsert(
        ids=[section.id for section in sections],
        documents=[build_statute_embedding_text(section) for section in sections],
        metadatas=[_metadata_for_section(section) for section in sections],
    )
    return len(sections)


def search_indian_statutes(
    query: str,
    top_k: int = 5,
    persist_dir: str = _CHROMA_DIR,
) -> list[dict[str, Any]]:
    """Search Indian statute sections by semantic similarity."""
    try:
        import chromadb
        from chromadb.config import Settings
    except ImportError as exc:
        raise ImportError("chromadb is required: pip install chromadb") from exc

    client = chromadb.PersistentClient(
        path=persist_dir,
        settings=Settings(anonymized_telemetry=False),
    )
    collection = client.get_or_create_collection(
        name=_INDIAN_STATUTES_COLLECTION,
        metadata={"hnsw:space": "cosine"},
    )
    if collection.count() == 0:
        return []

    results = collection.query(
        query_texts=[query],
        n_results=min(top_k, collection.count()),
    )
    matches: list[dict[str, Any]] = []
    for index, item_id in enumerate(results.get("ids", [[]])[0]):
        metadata = results.get("metadatas", [[]])[0][index]
        distance = results.get("distances", [[]])[0][index]
        matches.append(
            {
                "id": item_id,
                "similarity_score": round(max(0.0, 1.0 - distance), 4),
                **metadata,
            }
        )
    return matches


def _metadata_for_section(section: StatuteSection) -> dict[str, Any]:
    return {
        "act_name": section.act_name,
        "section_number": section.section_number,
        "section_title": section.section_title,
        "chapter": section.chapter,
        "source_pdf": section.source_pdf,
        "page_number": section.page_number,
        "jurisdiction": section.jurisdiction,
        "law_type": section.law_type,
        "text": section.text[:_MAX_DISPLAY_CHARS],
        "citation": _citation_for_section(section),
    }


def _citation_for_section(section: StatuteSection) -> str:
    title = f" - {section.section_title}" if section.section_title else ""
    return (
        f"{section.act_name}, Section {section.section_number}{title}, "
        f"p. {section.page_number}"
    )


def _normalize_text(text: str) -> str:
    text = text.replace("\u2014", ". ")
    text = text.replace("\u2013", "-")
    text = text.replace("\u00a0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _combine_pages(pages: list[dict[str, Any]]) -> tuple[str, list[tuple[int, int]]]:
    chunks: list[str] = []
    page_offsets: list[tuple[int, int]] = []
    offset = 0
    for page in pages:
        page_offsets.append((offset, page["page"]))
        chunk = page["text"].strip()
        chunks.append(chunk)
        offset += len(chunk) + 2
    return "\n\n".join(chunks), page_offsets


def _extract_act_name(text: str, source_pdf: str) -> str:
    for line in text.splitlines()[:80]:
        cleaned = line.strip(" .")
        if re.search(r"\bACT\b", cleaned, re.IGNORECASE) and re.search(r"\d{4}", cleaned):
            return cleaned.upper()
    return Path(source_pdf).stem.upper()


def _extract_chapter_markers(text: str) -> list[tuple[int, str]]:
    markers: list[tuple[int, str]] = []
    pattern = re.compile(r"(?im)^\s*(CHAPTER\s+[IVXLCDM0-9]+[^\n]{0,180})")
    for match in pattern.finditer(text):
        markers.append((match.start(), _cleanup_title(match.group(1)).upper()))
    return markers


def _iter_section_matches(text: str) -> Iterable[re.Match[str]]:
    pattern = re.compile(
        r"(?m)(?:^|\n|(?<=\.\s))\s*(?P<number>\d{1,3}[A-Z]?)\.\s+"
        r"(?P<title>[A-Z][A-Za-z0-9,;:.'() /-]{2,180}?)"
        r"(?:\.\s+|:\s+)"
    )
    return pattern.finditer(text)


def _cleanup_title(title: str) -> str:
    return re.sub(r"\s+", " ", title).strip(" .:-")


def _cleanup_section_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _page_for_offset(offset: int, page_offsets: list[tuple[int, int]]) -> int:
    current_page = page_offsets[0][1]
    for page_offset, page_number in page_offsets:
        if page_offset > offset:
            break
        current_page = page_number
    return current_page


def _chapter_for_offset(
    offset: int,
    chapter_markers: list[tuple[int, str]],
) -> str:
    current = ""
    for chapter_offset, chapter in chapter_markers:
        if chapter_offset > offset:
            break
        current = chapter
    return current


def _stable_section_id(
    act_name: str,
    section_number: str,
    source_pdf: str,
    start_offset: int,
) -> str:
    raw = f"{act_name}|{section_number}|{source_pdf}|{start_offset}".encode("utf-8")
    return hashlib.sha1(raw).hexdigest()[:24]
