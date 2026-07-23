"""
Downloads the Prisma query engine binary and places it where Prisma can find it.

Strategy:
  1. Use Prisma Python's own download() to populate the cache.
  2. Copy from cache → /tmp/ (always writable on Render).
  3. PRISMA_QUERY_ENGINE_BINARY env var points Prisma to /tmp/ path.
  4. Falls back to direct CDN download if cache copy is unavailable.
"""
import glob
import gzip
import os
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

TARGET = Path(
    os.getenv(
        "PRISMA_QUERY_ENGINE_BINARY",
        "/tmp/prisma-query-engine-debian-openssl-3.0.x",
    )
)


def _already_present() -> bool:
    return TARGET.exists() and TARGET.stat().st_size > 100_000


def _try_prisma_download() -> bool:
    """Use prisma py fetch to populate the cache, then copy from cache."""
    try:
        print("Running 'prisma py fetch' to populate cache…")
        subprocess.run(
            [sys.executable, "-m", "prisma", "py", "fetch"],
            check=True,
            timeout=120,
        )
    except Exception as e:
        print(f"  prisma py fetch failed: {e}")

    # Search cache for the engine binary (two naming conventions)
    patterns = [
        str(Path.home() / ".cache/prisma-python/**/prisma-query-engine-debian-openssl-3.0.x"),
        str(Path.home() / ".cache/prisma-python/**/query-engine-debian-openssl-3.0.x"),
        "/opt/render/.cache/prisma-python/**/prisma-query-engine-debian-openssl-3.0.x",
        "/opt/render/.cache/prisma-python/**/query-engine-debian-openssl-3.0.x",
    ]
    for pattern in patterns:
        matches = [m for m in glob.glob(pattern, recursive=True) if Path(m).stat().st_size > 100_000]
        if matches:
            shutil.copy2(matches[0], TARGET)
            TARGET.chmod(0o755)
            print(f"  Copied from cache: {matches[0]} → {TARGET}")
            return True
    return False


def _try_cdn_download(commit: str) -> bool:
    """Download directly from Prisma's CDN using multiple URL formats."""
    platform = "debian-openssl-3.0.x"
    urls = [
        f"https://binaries.prisma.sh/{commit}/{platform}/query-engine.gz",
        f"https://binaries.prisma.sh/all_commits/{commit}/{platform}/query-engine.gz",
        f"https://binaries.prisma.sh/v5.17.0/{commit}/{platform}/query-engine.gz",
    ]
    tmp = TARGET.with_suffix(".gz")
    for url in urls:
        print(f"  Trying CDN: {url}")
        try:
            urllib.request.urlretrieve(url, tmp)
            # Verify it's actually gzip
            with gzip.open(tmp, "rb") as f_in, open(TARGET, "wb") as f_out:
                shutil.copyfileobj(f_in, f_out)
            if TARGET.stat().st_size > 100_000:
                TARGET.chmod(0o755)
                size_mb = TARGET.stat().st_size / 1_048_576
                print(f"  Downloaded {size_mb:.1f} MB from CDN ✓")
                return True
            else:
                print("  Downloaded file too small — likely a 404 page")
                TARGET.unlink(missing_ok=True)
        except Exception as e:
            print(f"  Failed: {e}")
        finally:
            tmp.unlink(missing_ok=True)
    return False


def _get_commit() -> str:
    try:
        from prisma.binaries import BINARY_PATHS  # type: ignore[import]
        parts = Path(str(BINARY_PATHS.query_engine)).parts
        idx = next(i for i, p in enumerate(parts) if p == "binaries")
        return parts[idx + 2]
    except Exception:
        return "393aa359c9ad4a4bb28630fb5613f9c281cde053"  # prisma 5.17.0


def main() -> None:
    print(f"Prisma query engine target: {TARGET}")
    if _already_present():
        print(f"Already present ({TARGET.stat().st_size // 1024} KB) — skipping download.")
        return

    TARGET.parent.mkdir(parents=True, exist_ok=True)

    if _try_prisma_download():
        return

    commit = _get_commit()
    print(f"Cache miss. Downloading from CDN (commit {commit[:8]}…)")
    if _try_cdn_download(commit):
        return

    print("ERROR: Could not obtain Prisma query engine binary.", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    main()
