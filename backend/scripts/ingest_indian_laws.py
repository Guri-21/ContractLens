from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.intelligence.legal_corpus import ingest_indian_law_pdfs


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Extract Indian law PDFs and store section embeddings in ChromaDB."
    )
    parser.add_argument(
        "--laws-dir",
        type=Path,
        default=Path(__file__).resolve().parents[2] / "Dataset" / "Indian laws",
        help="Folder containing Indian law PDFs.",
    )
    args = parser.parse_args()

    summary = ingest_indian_law_pdfs(args.laws_dir)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
