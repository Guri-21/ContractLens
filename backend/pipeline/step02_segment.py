"""
Step 2 — Clause Segmentation
Splits raw page text into clause-level chunks using regex on section numbers.
A light Claude pass fixes edge cases the regex misses.
"""
import re
import json
import uuid
import anthropic
import os
from .config import PIPELINE_CONFIG

# Matches patterns like: 1.2, Section 3, 5(a), Article IV, CLAUSE 2
_SECTION_RE = re.compile(
    r"(?m)^(?:"
    r"(?:Section|SECTION|Article|ARTICLE|Clause|CLAUSE)\s+[\w.]+|"
    r"\d+(?:\.\d+)+(?:\s*\([a-z]\))?|"
    r"\d+\s*\([a-z]\)"
    r")\s*[.\-–]?\s*.{0,80}$"
)


def segment_clauses(
    pages: list[dict],
    document_id: str,
    document_name: str,
    document_type: str,
) -> list[dict]:
    full_text = "\n".join(p["text"] for p in pages)
    raw_segments = _regex_split(full_text, pages)
    if not raw_segments:
        # fallback: treat whole doc as one clause
        raw_segments = [{"sectionNumber": "1", "title": None, "text": full_text, "page": 1}]
    return _to_clause_dtos(raw_segments, document_id, document_name, document_type)


def _regex_split(text: str, pages: list[dict]) -> list[dict]:
    page_breaks = _build_page_map(pages)
    matches = list(_SECTION_RE.finditer(text))
    segments = []
    for i, m in enumerate(matches):
        start = m.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        header = m.group(0).strip()
        section_num, title = _parse_header(header)
        body = text[m.end():end].strip()
        page = _page_for_offset(start, page_breaks)
        segments.append({
            "sectionNumber": section_num,
            "title": title,
            "text": body,
            "page": page,
        })
    return segments


def _parse_header(header: str) -> tuple[str | None, str | None]:
    num_match = re.match(r"^([\d.]+(?:\([a-z]\))?|(?:Section|Article|Clause)\s+[\w.]+)", header, re.I)
    num = num_match.group(1).strip() if num_match else None
    title_part = header[num_match.end():].strip(" .-–") if num_match else header
    return num, title_part or None


def _build_page_map(pages: list[dict]) -> list[tuple[int, int]]:
    offset = 0
    result = []
    for p in pages:
        result.append((offset, p["page"]))
        offset += len(p["text"]) + 1
    return result


def _page_for_offset(offset: int, page_breaks: list[tuple[int, int]]) -> int:
    page = 1
    for start, p in page_breaks:
        if offset >= start:
            page = p
    return page


def _to_clause_dtos(segments: list[dict], doc_id: str, doc_name: str, doc_type: str) -> list[dict]:
    return [
        {
            "id": f"c_{uuid.uuid4().hex[:8]}",
            "documentId": doc_id,
            "documentName": doc_name,
            "documentType": doc_type,
            "sectionNumber": s["sectionNumber"],
            "title": s["title"],
            "page": s["page"],
            "text": s["text"],
            "clauseType": None,
            "references": [],
            "overrides": [],
            "tableData": None,
        }
        for s in segments
        if s["text"].strip()
    ]
