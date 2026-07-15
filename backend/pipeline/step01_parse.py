"""
Step 1 — Document Parsing (deterministic, no LLM)
Extracts raw text + page metadata from PDF or DOCX.
Returns a list of page dicts: {page, text, tables}
"""
import os
from typing import Any


def parse_document(file_path: str) -> list[dict[str, Any]]:
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        return _parse_pdf(file_path)
    if ext in (".docx", ".doc"):
        return _parse_docx(file_path)
    if ext == ".txt":
        return _parse_txt(file_path)
    raise ValueError(f"Unsupported file type: {ext}")


def _parse_pdf(path: str) -> list[dict[str, Any]]:
    import pdfplumber
    pages = []
    with pdfplumber.open(path) as pdf:
        for i, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            if not text.strip():
                # OCR fallback via PyMuPDF
                text = _ocr_page_fitz(path, i - 1)
            tables = page.extract_tables() or []
            pages.append({"page": i, "text": text, "tables": tables})
    return pages


def _parse_docx(path: str) -> list[dict[str, Any]]:
    from docx import Document
    doc = Document(path)
    full_text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    return [{"page": 1, "text": full_text, "tables": []}]


def _parse_txt(path: str) -> list[dict[str, Any]]:
    with open(path, "r", encoding="utf-8", errors="replace") as file:
        text = file.read()
    return [{"page": 1, "text": text, "tables": []}]


def _ocr_page_fitz(path: str, page_index: int) -> str:
    """PyMuPDF text extraction fallback for scanned pages."""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(path)
        return doc[page_index].get_text()
    except Exception:
        return ""
