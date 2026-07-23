"""
File storage — content is stored as bytes in Neon (PostgreSQL bytea column).

Uploads save raw bytes to Document.file_content.
Analysis routes write those bytes to a short-lived temp file for the pipeline.
"""
from __future__ import annotations

import logging
import os
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)


def write_temp_file(content: bytes, suffix: str) -> str:
    """Write bytes to a temp file and return its path. Caller must delete it."""
    fd, tmp_path = tempfile.mkstemp(suffix=suffix)
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(content)
    except Exception:
        os.remove(tmp_path)
        raise
    logger.debug("Wrote %d bytes to temp file %s", len(content), tmp_path)
    return tmp_path


def delete_temp(path: str) -> None:
    """Delete a temp file. Never raises."""
    try:
        if path and os.path.exists(path):
            os.remove(path)
    except OSError:
        pass
