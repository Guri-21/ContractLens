"""
Step 2 - Clause Segmentation.

Splits raw page text into clause-level chunks using legal numbering markers.
This is deterministic: no LLM is used for segmentation.
"""

import re
import uuid


# Candidate markers. We filter context in code so legal citations and numbers
# inside ordinary sentences are not treated as clauses.
_SECTION_CANDIDATE_RE = re.compile(
    r"(?P<section>"
    r"(?:Section|Article|Clause)\s+[A-Za-z0-9IVXLC.]+|"
    r"\d{1,2}(?:\.\d{1,2})+(?:\([a-z]\))?|"
    r"\d{1,2}\([a-z]\)|"
    r"\d{1,2}"
    r")"
    r"[.)]?\s+"
    r"(?=[A-Z])",
    re.IGNORECASE,
)
_CITATION_WORDS = {"usc", "u.s.c", "cfr", "ccr", "usca", "uscs", "fed", "usd", "gbp"}
_TITLE_MAX_CHARS = 100


def segment_clauses(
    pages: list[dict],
    document_id: str,
    document_name: str,
    document_type: str,
) -> list[dict]:
    full_text = "\n".join(p["text"] for p in pages)
    raw_segments = _regex_split(full_text, pages)
    if not raw_segments:
        raw_segments = [{"sectionNumber": "1", "title": None, "text": full_text, "page": 1}]
    return _to_clause_dtos(raw_segments, document_id, document_name, document_type)


def _regex_split(text: str, pages: list[dict]) -> list[dict]:
    page_breaks = _build_page_map(pages)
    matches = _find_section_markers(text)
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
            }
        )

    return segments


def _find_section_markers(text: str) -> list[dict]:
    markers = []
    for match in _SECTION_CANDIDATE_RE.finditer(text):
        section = _normalise_section(match.group("section"))
        marker = {"section": section, "start": match.start(), "end": match.end()}
        if _is_valid_section_marker(text, marker, markers[-1] if markers else None):
            markers.append(marker)
    return _dedupe_nested_markers(markers)


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
            "text": s["text"] or s["title"] or "",
            "clauseType": None,
            "references": [],
            "overrides": [],
            "tableData": None,
        }
        for s in segments
        if s["text"].strip() or (s["title"] or "").strip()
    ]
