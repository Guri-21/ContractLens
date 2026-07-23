"""
One-shot script: ingest Indian law PDFs into Chroma Cloud.

Run from the backend/ directory after setting CHROMA_* env vars (or via .env):
    python ingest_to_cloud.py

Needs: pip install pdfplumber chromadb[httpx]
"""

import os
import sys
from pathlib import Path

# Load .env so CHROMA_* vars are available when run locally
_env = Path(__file__).parent / ".env"
if _env.exists():
    for raw in _env.read_text(encoding="utf-8-sig", errors="replace").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        clean = value.strip().strip('"').strip("'")
        if clean:
            os.environ.setdefault(key.strip().lstrip("﻿"), clean)

from app.intelligence.legal_corpus import ingest_indian_law_pdfs

LAWS_DIR = Path(__file__).parents[1] / "Dataset" / "Indian laws"

if not LAWS_DIR.exists():
    print(f"ERROR: Laws directory not found: {LAWS_DIR}", file=sys.stderr)
    sys.exit(1)

missing = [v for v in ("CHROMA_API_KEY", "CHROMA_TENANT", "CHROMA_DATABASE") if not os.getenv(v)]
if missing:
    print(f"ERROR: Missing env vars: {', '.join(missing)}", file=sys.stderr)
    sys.exit(1)

print(f"Ingesting PDFs from: {LAWS_DIR}")
print(f"Target: {os.getenv('CHROMA_HOST', 'api.trychroma.com')} / {os.getenv('CHROMA_DATABASE')}")
print()

result = ingest_indian_law_pdfs(LAWS_DIR)

print(f"Done.")
print(f"  PDFs processed : {result['pdf_count']}")
print(f"  Sections found : {result['section_count']}")
print(f"  Sections stored: {result['stored_count']}")
print(f"  Collection     : {result['collection']}")
