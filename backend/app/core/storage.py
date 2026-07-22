"""At-rest protection for uploaded documents.

Two layers, both best-effort with graceful degradation:

1. Restrictive file permissions (0o600) on every stored upload so other OS
   users can't read confidential contracts. Always applied.
2. Optional application-level encryption (Fernet/AES-128-CBC+HMAC). Enabled
   when AT_REST_ENCRYPTION_KEY is set and the `cryptography` package is
   installed. Files are encrypted at rest; the pipeline decrypts to a
   short-lived temp file only for the moment it needs to parse them.

Migration-safe: reads transparently handle both encrypted and legacy
plaintext files, so enabling encryption does not break existing uploads.
"""
from __future__ import annotations

import logging
import os
import tempfile

logger = logging.getLogger(__name__)

# Fernet ciphertext always starts with the version byte 0x80 ("gAAAAA" in
# base64), which lets us detect encrypted vs. legacy-plaintext files on read.
_FERNET_PREFIX = b"gAAAAA"


def _get_fernet():
    """Return a Fernet instance, or None if encryption isn't configured."""
    key = os.getenv("AT_REST_ENCRYPTION_KEY", "").strip()
    if not key:
        return None
    try:
        from cryptography.fernet import Fernet  # type: ignore[import]
    except ImportError:
        logger.warning(
            "AT_REST_ENCRYPTION_KEY is set but 'cryptography' is not installed; "
            "storing uploads unencrypted. Run: pip install cryptography"
        )
        return None
    try:
        return Fernet(key.encode("utf-8"))
    except Exception as exc:
        logger.error("Invalid AT_REST_ENCRYPTION_KEY (must be a urlsafe base64 32-byte key): %s", exc)
        return None


def harden_permissions(path: str) -> None:
    """Restrict a file to owner read/write. Best-effort (POSIX; Windows ACLs
    differ but chmod is still a no-op-safe call)."""
    try:
        os.chmod(path, 0o600)
    except OSError as exc:  # pragma: no cover - platform dependent
        logger.debug("Could not chmod %s: %s", os.path.basename(path), exc)


def encrypt_at_rest(path: str) -> None:
    """Encrypt a file in place if encryption is enabled. Idempotent: skips
    files that are already encrypted."""
    fernet = _get_fernet()
    harden_permissions(path)
    if fernet is None:
        return
    with open(path, "rb") as f:
        data = f.read()
    if data.startswith(_FERNET_PREFIX):
        return  # already encrypted
    token = fernet.encrypt(data)
    with open(path, "wb") as f:
        f.write(token)
    harden_permissions(path)


def open_plaintext(path: str) -> tuple[str, bool]:
    """Return (usable_path, is_temp). If the file is encrypted, decrypt it to a
    permission-restricted temp file and return that path with is_temp=True. The
    caller MUST call cleanup_temp(path) when done. Plaintext files are returned
    as-is (is_temp=False)."""
    fernet = _get_fernet()
    with open(path, "rb") as f:
        head = f.read(len(_FERNET_PREFIX))
    if fernet is None or not head.startswith(_FERNET_PREFIX):
        return path, False

    with open(path, "rb") as f:
        token = f.read()
    plaintext = fernet.decrypt(token)
    suffix = os.path.splitext(path)[1]
    fd, temp_path = tempfile.mkstemp(suffix=suffix)
    try:
        with os.fdopen(fd, "wb") as tmp:
            tmp.write(plaintext)
        harden_permissions(temp_path)
    except Exception:
        cleanup_temp(temp_path)
        raise
    return temp_path, True


def cleanup_temp(path: str) -> None:
    """Delete a temp file created by open_plaintext. Never raises."""
    try:
        if path and os.path.exists(path):
            os.remove(path)
    except OSError:
        pass
