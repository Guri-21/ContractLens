"""
Downloads the Prisma query engine binary to the current directory.

Prisma Python's build/runtime containers on Render are separate — the
cache dir (~/.cache/prisma-python/) is NOT carried over to the runtime
container. Running this script during the build step places the engine
binary in the project directory (which IS included in the artifact upload),
so it's available at the expected path at runtime without re-downloading.
"""
import gzip
import os
import shutil
import sys
import urllib.request
from pathlib import Path


def _resolve_binary_info() -> tuple[str, str, str]:
    """Return (version, commit, binary_name) from the installed Prisma package."""
    from prisma.binaries import BINARY_PATHS  # type: ignore[import]

    expected = Path(str(BINARY_PATHS.query_engine))
    binary_name = expected.name
    parts = expected.parts
    idx = next(i for i, p in enumerate(parts) if p == "binaries")
    version = parts[idx + 1]
    commit = parts[idx + 2]
    return version, commit, binary_name


def main() -> None:
    try:
        version, commit, binary_name = _resolve_binary_info()
    except Exception as exc:
        print(f"WARNING: could not introspect Prisma binary paths ({exc}). Using hardcoded fallback.")
        version = "5.17.0"
        commit = "393aa359c9ad4a4bb28630fb5613f9c281cde053"
        binary_name = "prisma-query-engine-debian-openssl-3.0.x"

    target = Path(".") / binary_name
    if target.exists() and target.stat().st_size > 0:
        print(f"Query engine already present: {target}")
        return

    platform = binary_name.replace("prisma-query-engine-", "")
    url = (
        f"https://binaries.prisma.sh/all_commits/{commit}/{platform}/query-engine.gz"
    )
    print(f"Downloading Prisma query engine v{version} ({commit[:8]}…)")
    print(f"  URL: {url}")

    tmp = target.with_suffix(".gz")
    try:
        urllib.request.urlretrieve(url, tmp)
        with gzip.open(tmp, "rb") as f_in, open(target, "wb") as f_out:
            shutil.copyfileobj(f_in, f_out)
        os.chmod(target, 0o755)
        size_mb = target.stat().st_size / 1_048_576
        print(f"  Saved {target} ({size_mb:.1f} MB)")
    except Exception as exc:
        tmp.unlink(missing_ok=True)
        print(f"ERROR: failed to download query engine: {exc}", file=sys.stderr)
        sys.exit(1)
    finally:
        if tmp.exists():
            tmp.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
