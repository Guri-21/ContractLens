"""
Step 2 - Clause Segmentation.

Splits raw page text into clause-level chunks using legal numbering markers.
This is deterministic: no LLM is used for segmentation.
"""

import re
import uuid
from copy import deepcopy


# Candidate markers. We filter context in code so legal citations and numbers
# inside ordinary sentences are not treated as clauses.
_SECTION_CANDIDATE_RE = re.compile(
    r"(?P<section>"
    r"(?:Section|Article|Clause|Schedule|Exhibit|Appendix|Annex)\s+[A-Za-z0-9IVXLC.]+|"  # named sections + exhibits
    r"[IVXLC]{1,6}(?:\.[IVXLC0-9]{1,4})*(?=\.\s+[A-Z])|"  # Roman numerals: IV. TERM
    r"\d{1,2}(?:\.\d{1,2})+(?:\([a-z]\))?|"                # 2.1, 3.1(a)
    r"\d{1,2}\([a-z]\)|"                                    # 1(a)
    r"\([a-z]{1,3}\)|"                                      # (a), (b), (iii) sub-clauses
    r"\d{1,2}"                                              # bare digits
    r")"
    r"[.)]?\s+"
    r"(?=[A-Z])",
    re.IGNORECASE,
)

# ALL-CAPS header pattern: a line that is entirely uppercase words (2-6 words), used as a section boundary
_ALL_CAPS_HEADER_RE = re.compile(
    r"(?m)^(?P<section>[A-Z][A-Z\s\-&/]{4,60}[A-Z])(?:\s*\n)",
)

_CITATION_WORDS = {"usc", "u.s.c", "cfr", "ccr", "usca", "uscs", "fed", "usd", "gbp"}
_TITLE_MAX_CHARS = 100


class ClauseSegmentationIterator:
    def __init__(self, document_id: str, document_name: str, document_type: str):
        self._document_id = document_id
        self._document_name = document_name
        self._document_type = document_type
        self._pending_pages: list[dict] = []
        self._next_ordinal = 0
        self._flushed = False

    def feed_page(self, page: dict) -> list[dict]:
        if self._flushed:
            raise RuntimeError("Cannot feed pages after segmentation is flushed")

        self._pending_pages.append(
            {
                "page": page["page"],
                "text": page["text"],
                "tables": deepcopy(page.get("tables", [])),
            }
        )
        return self._emit_confirmed()

    def flush(self) -> list[dict]:
        if self._flushed:
            return []
        self._flushed = True
        text = self._pending_text()
        segments = _regex_split(text, self._pending_pages)
        if not segments:
            segments = [_fallback_segment(text, self._pending_pages)]
        clauses = self._to_dtos(segments)
        self._pending_pages = []
        return clauses

    def _emit_confirmed(self) -> list[dict]:
        text = self._pending_text()
        markers = _find_section_markers(text)
        if not markers:
            return []
        if len(markers) == 1:
            self._pending_pages = _pages_from_offset(
                self._pending_pages, markers[0]["start"]
            )
            return []

        segments = _segments_from_markers(text, self._pending_pages, markers)
        clauses = self._to_dtos(segments[:-1])
        self._pending_pages = _pages_from_offset(
            self._pending_pages, markers[-1]["start"]
        )
        return clauses

    def _pending_text(self) -> str:
        return "\n".join(page["text"] for page in self._pending_pages)

    def _to_dtos(self, segments: list[dict]) -> list[dict]:
        clauses = _to_clause_dtos(
            segments,
            self._document_id,
            self._document_name,
            self._document_type,
            start_index=self._next_ordinal,
        )
        self._next_ordinal += len(segments)
        return clauses


def segment_clauses(
    pages: list[dict],
    document_id: str,
    document_name: str,
    document_type: str,
) -> list[dict]:
    stream = ClauseSegmentationIterator(document_id, document_name, document_type)
    clauses = []
    for page in pages:
        clauses.extend(stream.feed_page(page))
    clauses.extend(stream.flush())
    return clauses


def _regex_split(text: str, pages: list[dict]) -> list[dict]:
    matches = _find_section_markers(text)
    return _segments_from_markers(text, pages, matches)


def _segments_from_markers(text: str, pages: list[dict], matches: list[dict]) -> list[dict]:
    page_breaks = _build_page_map(pages)
    segments = []

    for i, marker in enumerate(matches):
        start = marker["start"]
        end = matches[i + 1]["start"] if i + 1 < len(matches) else len(text)
        content = _clean_segment_text(text[marker["end"] : end])
        title, body = _split_title_and_body(marker["section"], content)
        segments.append(
            {
                "sectionNumber": marker["section"],
                "title": title,
                "text": body,
                "page": _page_for_offset(start, page_breaks),
                "tableData": _tables_for_offsets(start, end, pages, page_breaks),
            }
        )

    return segments


def _fallback_segment(text: str, pages: list[dict]) -> dict:
    return {
        "sectionNumber": "1",
        "title": None,
        "text": text,
        "page": pages[0]["page"] if pages else 1,
        "tableData": _all_tables(pages),
    }


def _find_section_markers(text: str) -> list[dict]:
    raw: list[dict] = []

    for match in _SECTION_CANDIDATE_RE.finditer(text):
        section = _normalise_section(match.group("section"))
        marker = {"section": section, "start": match.start(), "end": match.end()}
        last = raw[-1] if raw else None
        if _is_valid_section_marker(text, marker, last):
            raw.append(marker)

    # ALL-CAPS headers (e.g. "CONFIDENTIALITY\n", "TERM AND TERMINATION\n")
    # treated as implicit section boundaries if not already captured above.
    covered_starts = {m["start"] for m in raw}
    for match in _ALL_CAPS_HEADER_RE.finditer(text):
        if match.start() not in covered_starts:
            section = match.group("section").strip()
            raw.append({"section": section, "start": match.start(), "end": match.end()})

    # Sort by position then dedupe
    raw.sort(key=lambda m: m["start"])
    return _dedupe_nested_markers(raw)


def _is_valid_section_marker(text: str, marker: dict, previous_marker: dict | None) -> bool:
    start = marker["start"]
    end = marker["end"]
    section = marker["section"]

    if not _has_clause_boundary_before(text, start) and not _continues_parent_heading(text, marker, previous_marker):
        return False

    if section.isdigit():
        if _previous_nonspace_char(text, start) in {";", ":"}:
            return False
        next_word = _next_word(text, end)
        if next_word.lower() in _CITATION_WORDS:
            return False
        if not _looks_like_top_level_heading(text, end):
            return False

    return True


def _has_clause_boundary_before(text: str, start: int) -> bool:
    if start <= 0:
        return True
    if text[start - 1] in "\r\n":
        return True

    prefix = text[:start].rstrip()
    if not prefix:
        return True
    return prefix.endswith(("\n", ".", ";", ":"))


def _previous_nonspace_char(text: str, start: int) -> str:
    prefix = text[:start].rstrip()
    return prefix[-1:] if prefix else ""


def _continues_parent_heading(text: str, marker: dict, previous_marker: dict | None) -> bool:
    if previous_marker is None:
        return False

    parent = previous_marker["section"]
    section = marker["section"]
    if not parent.isdigit() or not section.startswith(f"{parent}."):
        return False

    between = _clean_segment_text(text[previous_marker["end"] : marker["start"]])
    return bool(between) and len(between) <= _TITLE_MAX_CHARS and "." not in between


def _looks_like_top_level_heading(text: str, end: int) -> bool:
    preview = text[end : end + _TITLE_MAX_CHARS]
    next_marker = _SECTION_CANDIDATE_RE.search(preview)
    title_candidate = preview[: next_marker.start() if next_marker else len(preview)]
    title_candidate = title_candidate.strip()
    if not title_candidate:
        return False

    first_word = title_candidate.split()[0].strip(".,;:()[]")
    return first_word[:1].isupper() and not first_word.isdigit()


def _next_word(text: str, index: int) -> str:
    match = re.match(r"\s*([A-Za-z.]+)", text[index:])
    return match.group(1) if match else ""


def _normalise_section(section: str) -> str:
    return section.strip().rstrip(".)")


def _dedupe_nested_markers(markers: list[dict]) -> list[dict]:
    deduped = []
    for marker in markers:
        if deduped and marker["start"] == deduped[-1]["start"]:
            if len(marker["section"]) > len(deduped[-1]["section"]):
                deduped[-1] = marker
            continue
        deduped.append(marker)
    return deduped


def _clean_segment_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _split_title_and_body(section_num: str, content: str) -> tuple[str | None, str]:
    if not content:
        return None, ""

    if _is_title_only(content):
        title = content.rstrip(".")
        return title, title

    if section_num.isdigit():
        return _split_top_level_title(content)

    return None, content


def _is_title_only(content: str) -> bool:
    stripped = content.strip().rstrip(".")
    if len(stripped) > _TITLE_MAX_CHARS:
        return False

    words = stripped.split()
    if not words:
        return False

    uppercase_words = sum(1 for word in words if word.strip("()[]").isupper())
    return uppercase_words / len(words) >= 0.6


def _split_top_level_title(content: str) -> tuple[str | None, str]:
    all_caps_split = _split_leading_all_caps_title(content)
    if all_caps_split:
        return all_caps_split

    first_sentence, _separator, rest = content.partition(". ")
    candidate = first_sentence.strip().rstrip(".")
    if candidate and len(candidate) <= _TITLE_MAX_CHARS:
        return candidate, rest.strip()
    return None, content


def _split_leading_all_caps_title(content: str) -> tuple[str, str] | None:
    words = list(re.finditer(r"\S+", content))
    if not words:
        return None

    title_end = None
    title_word_count = 0
    for word_match in words:
        word = word_match.group(0).strip(".,;:()[]")
        if not word:
            continue
        if not word.isupper():
            break
        title_end = word_match.end()
        title_word_count += 1

    if title_end is None:
        return None

    title = content[:title_end].strip().rstrip(".")
    body = content[title_end:].strip()
    if title_word_count >= 1 and body and len(title) <= _TITLE_MAX_CHARS:
        return title, body
    return None


def _build_page_map(pages: list[dict]) -> list[tuple[int, int]]:
    offset = 0
    result = []
    for p in pages:
        result.append((offset, p["page"]))
        offset += len(p["text"]) + 1
    return result


def _pages_from_offset(pages: list[dict], offset: int) -> list[dict]:
    page_breaks = _build_page_map(pages)
    for index, (page_start, _page_number) in enumerate(page_breaks):
        page = pages[index]
        page_end = page_start + len(page["text"])
        if offset <= page_end:
            retained = {
                "page": page["page"],
                "text": page["text"][offset - page_start :],
                "tables": deepcopy(page.get("tables", [])),
            }
            return [retained, *deepcopy(pages[index + 1 :])]
    return []


def _page_for_offset(offset: int, page_breaks: list[tuple[int, int]]) -> int:
    page = 1
    for start, p in page_breaks:
        if offset >= start:
            page = p
    return page


def _tables_for_offsets(
    start: int,
    end: int,
    pages: list[dict],
    page_breaks: list[tuple[int, int]],
) -> list | None:
    start_page = _page_for_offset(start, page_breaks)
    end_page = _page_for_offset(max(start, end - 1), page_breaks)
    tables = [
        deepcopy(table)
        for page in pages
        if start_page <= page["page"] <= end_page
        for table in page.get("tables", [])
    ]
    return tables or None


def _all_tables(pages: list[dict]) -> list | None:
    tables = [deepcopy(table) for page in pages for table in page.get("tables", [])]
    return tables or None


def _clause_id(doc_id: str, ordinal: int, segment: dict) -> str:
    identity = ":".join(
        (
            doc_id,
            str(ordinal),
            segment["sectionNumber"],
            str(segment["page"]),
        )
    )
    return f"c_{uuid.uuid5(uuid.NAMESPACE_URL, identity).hex[:8]}"


def _to_clause_dtos(
    segments: list[dict],
    doc_id: str,
    doc_name: str,
    doc_type: str,
    start_index: int = 0,
) -> list[dict]:
    clauses = []
    for offset, segment in enumerate(segments):
        if not segment["text"].strip() and not (segment["title"] or "").strip():
            continue
        clauses.append(
            {
                "id": _clause_id(doc_id, start_index + offset, segment),
                "documentId": doc_id,
                "documentName": doc_name,
                "documentType": doc_type,
                "sectionNumber": segment["sectionNumber"],
                "title": segment["title"],
                "page": segment["page"],
                "text": segment["text"] or segment["title"] or "",
                "clauseType": None,
                "references": [],
                "overrides": [],
                "tableData": deepcopy(segment.get("tableData")),
            }
        )
    return clauses
