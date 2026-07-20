import asyncio
import contextlib
import logging

from dotenv import load_dotenv
from prisma import Prisma

load_dotenv(override=True)

_logger = logging.getLogger(__name__)

db = Prisma()


async def _connect_with_retry(client: Prisma, max_attempts: int = 5) -> None:
    """Attempt DB connect with exponential backoff (1s, 2s, 4s, 8s, 16s)."""
    for attempt in range(1, max_attempts + 1):
        try:
            await client.connect()
            _logger.info("Database connected on attempt %d", attempt)
            return
        except Exception as exc:
            if attempt == max_attempts:
                raise RuntimeError(
                    f"Database connection failed after {max_attempts} attempts: {exc}"
                ) from exc
            wait = 2 ** (attempt - 1)
            _logger.warning(
                "DB connect attempt %d/%d failed, retrying in %ds: %s",
                attempt, max_attempts, wait, exc,
            )
            await asyncio.sleep(wait)


async def get_db():
    if not db.is_connected():
        await _connect_with_retry(db)
    else:
        # Prisma reports is_connected()=True even when pool connections are stale.
        # A cheap SELECT 1 detects this and forces a reconnect before the request runs.
        try:
            await db.execute_raw("SELECT 1")
        except Exception as exc:
            _logger.warning("DB ping failed (%s) — reconnecting pool…", exc)
            with contextlib.suppress(Exception):
                await db.disconnect()
            await _connect_with_retry(db)
    yield db
