"""
One-shot script: ingest all 12 Indian law PDFs into Supabase pgvector.

Usage (from backend/ directory):
    python ingest_to_pgvector.py

Requires .env with DATABASE_URL and JINA_API_KEY set.
"""
import logging
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("ingest")

# Path to Indian law PDFs
LAWS_DIR = Path(__file__).parent.parent / "Dataset" / "Indian laws"


def main() -> None:
    if not LAWS_DIR.exists():
        logger.error("Laws directory not found: %s", LAWS_DIR)
        sys.exit(1)

    pdfs = sorted(LAWS_DIR.glob("*.pdf"))
    if not pdfs:
        logger.error("No PDF files found in %s", LAWS_DIR)
        sys.exit(1)

    logger.info("Found %d PDFs in %s", len(pdfs), LAWS_DIR)

    if not os.getenv("DATABASE_URL"):
        logger.error("DATABASE_URL is not set — add it to .env")
        sys.exit(1)
    if not os.getenv("JINA_API_KEY"):
        logger.error("JINA_API_KEY is not set — get a free key at https://jina.ai")
        sys.exit(1)

    sys.path.insert(0, str(Path(__file__).parent))
    from app.intelligence.legal_corpus import ingest_indian_law_pdfs

    logger.info("Starting ingestion…")
    summary = ingest_indian_law_pdfs(LAWS_DIR)

    logger.info("Done!")
    logger.info("  PDFs processed : %d", summary["pdf_count"])
    logger.info("  Sections found : %d", summary["section_count"])
    logger.info("  Sections stored: %d", summary["stored_count"])


if __name__ == "__main__":
    main()
