"""
File storage abstraction: local disk (dev) or Supabase Storage (prod).

Storage paths:
  - Local:    /absolute/path/to/file.pdf
  - Supabase: supabase://contractlens-uploads/uuid/filename.pdf

Both `upload_file` and `open_for_reading` are called from the upload and
analysis routes. The backend chosen is determined by whether SUPABASE_URL
and SUPABASE_SERVICE_KEY are set.
"""
from __future__ import annotations

import logging
import os
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)

_SUPABASE_SCHEME = "supabase://"
_BUCKET = "contractlens-uploads"


def _get_supabase():
    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_KEY", "").strip()
    if not url or not key:
        return None
    try:
        from supabase import create_client
        return create_client(url, key)
    except ImportError:
        logger.warning("supabase package not installed; falling back to local storage")
        return None


def is_supabase_path(path: str) -> bool:
    return path.startswith(_SUPABASE_SCHEME)


def _parse_supabase_path(path: str) -> tuple[str, str]:
    """Return (bucket, object_path) from supabase://bucket/object_path."""
    without_scheme = path[len(_SUPABASE_SCHEME):]
    bucket, _, object_path = without_scheme.partition("/")
    return bucket, object_path


def upload_file(contents: bytes, object_name: str) -> str:
    """
    Store file contents and return a storage path for the DB.
    Uses Supabase if configured, local disk otherwise.
    """
    client = _get_supabase()
    if client:
        try:
            client.storage.from_(_BUCKET).upload(
                path=object_name,
                file=contents,
                file_options={"upsert": "true"},
            )
            storage_path = f"{_SUPABASE_SCHEME}{_BUCKET}/{object_name}"
            logger.info("Uploaded %s to Supabase Storage", object_name)
            return storage_path
        except Exception as exc:
            logger.error("Supabase upload failed for %s: %s — falling back to local", object_name, exc)

    # Local fallback
    upload_dir = Path(__file__).resolve().parents[2] / "uploads"
    upload_dir.mkdir(exist_ok=True)
    local_path = str(upload_dir / object_name)
    with open(local_path, "wb") as f:
        f.write(contents)
    logger.info("Saved %s to local disk", object_name)
    return local_path


def open_for_reading(storage_path: str) -> tuple[str, bool]:
    """
    Return (usable_local_path, is_temp).
    For Supabase paths: downloads to a temp file (is_temp=True, caller must delete).
    For local paths: returns the path as-is (is_temp=False).
    """
    if not is_supabase_path(storage_path):
        return storage_path, False

    bucket, object_path = _parse_supabase_path(storage_path)
    client = _get_supabase()
    if client is None:
        raise RuntimeError(
            f"File is stored in Supabase ({storage_path}) but SUPABASE_URL/"
            "SUPABASE_SERVICE_KEY are not configured."
        )

    data: bytes = client.storage.from_(bucket).download(object_path)
    suffix = Path(object_path).suffix
    fd, tmp_path = tempfile.mkstemp(suffix=suffix)
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(data)
    except Exception:
        os.remove(tmp_path)
        raise
    logger.debug("Downloaded %s to temp file %s", object_path, tmp_path)
    return tmp_path, True


def delete_file(storage_path: str) -> None:
    """Delete a stored file. Silent on missing files."""
    if is_supabase_path(storage_path):
        bucket, object_path = _parse_supabase_path(storage_path)
        client = _get_supabase()
        if client:
            try:
                client.storage.from_(bucket).remove([object_path])
            except Exception as exc:
                logger.warning("Supabase delete failed for %s: %s", object_path, exc)
    else:
        try:
            if os.path.exists(storage_path):
                os.remove(storage_path)
        except OSError as exc:
            logger.warning("Local delete failed for %s: %s", storage_path, exc)
