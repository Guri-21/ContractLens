"""
Step 1 — Document Parsing (deterministic, no LLM)
Extracts raw text + page metadata from PDF or DOCX.
Returns a list of page dicts: {page, text, tables}
"""
import os
from collections.abc import Iterator
from typing import Any


def parse_document(file_path: str) -> list[dict[str, Any]]:
    return list(iter_document_pages(file_path))


def iter_document_pages(file_path: str) -> Iterator[dict[str, Any]]:
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        yield from _iter_pdf_pages(file_path)
        return
    if ext in (".docx", ".doc"):
        yield from _iter_docx_pages(file_path)
        return
    if ext == ".txt":
        yield from _iter_txt_pages(file_path)
        return
    raise ValueError(f"Unsupported file type: {ext}")


def _iter_pdf_pages(path: str) -> Iterator[dict[str, Any]]:
    import pdfplumber

    with pdfplumber.open(path) as pdf:
        for i, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            if not text.strip():
                # OCR fallback via PyMuPDF
                text = _ocr_page_fitz(path, i - 1)
            tables = page.extract_tables() or []
            yield {"page": i, "text": text, "tables": tables}


def _iter_docx_pages(path: str) -> Iterator[dict[str, Any]]:
    from docx import Document

    doc = Document(path)
    full_text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    yield {"page": 1, "text": full_text, "tables": []}


def _iter_txt_pages(path: str) -> Iterator[dict[str, Any]]:
    with open(path, "r", encoding="utf-8", errors="replace") as file:
        text = file.read()
    yield {"page": 1, "text": text, "tables": []}


def _ocr_page_fitz(path: str, page_index: int) -> str:
    """PyMuPDF text extraction fallback for scanned pages."""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(path)
        return doc[page_index].get_text()
    except Exception:
        return ""
