"""
Jina AI text embeddings via REST API.

Free tier: 1M tokens, no credit card.
Model: jina-embeddings-v3 — 1024-dimensional dense vectors.
"""
from __future__ import annotations

import logging
import os
import time

import httpx

logger = logging.getLogger(__name__)

_JINA_URL = "https://api.jina.ai/v1/embeddings"
_MODEL = "jina-embeddings-v3"
_BATCH = 50          # smaller batch to stay under rate limits
_SLEEP_BETWEEN = 4.0 # seconds between successful batches (free tier ~15 RPM)
_MAX_RETRIES = 5


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a list of texts using Jina AI. Returns one 1024-dim vector per text."""
    api_key = os.getenv("JINA_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("JINA_API_KEY env var is not set — get a free key at jina.ai")

    all_embeddings: list[list[float]] = []
    total_batches = -(-len(texts) // _BATCH)

    for i in range(0, len(texts), _BATCH):
        batch = texts[i : i + _BATCH]
        batch_num = i // _BATCH + 1

        for attempt in range(1, _MAX_RETRIES + 1):
            try:
                resp = httpx.post(
                    _JINA_URL,
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={"model": _MODEL, "input": batch},
                    timeout=60.0,
                )
            except (httpx.RemoteProtocolError, httpx.ConnectError, httpx.ReadError) as exc:
                # Server closed connection — treat as transient, wait and retry
                wait = 10 * attempt
                logger.warning(
                    "Connection error on batch %d/%d (%s) — waiting %ds (attempt %d/%d)",
                    batch_num, total_batches, exc, wait, attempt, _MAX_RETRIES,
                )
                time.sleep(wait)
                continue

            if resp.status_code == 429:
                retry_after = int(resp.headers.get("Retry-After", 0))
                wait = retry_after if retry_after > 0 else (15 * attempt)
                logger.warning(
                    "Rate limited on batch %d/%d — waiting %ds (attempt %d/%d)",
                    batch_num, total_batches, wait, attempt, _MAX_RETRIES,
                )
                time.sleep(wait)
                continue

            resp.raise_for_status()
            break
        else:
            raise RuntimeError(f"Jina API failed after {_MAX_RETRIES} retries on batch {batch_num}")

        data = resp.json()
        batch_embeddings = [item["embedding"] for item in data["data"]]
        all_embeddings.extend(batch_embeddings)
        logger.info("Embedded batch %d/%d (%d texts)", batch_num, total_batches, len(batch))

        if i + _BATCH < len(texts):  # don't sleep after the last batch
            time.sleep(_SLEEP_BETWEEN)

    return all_embeddings


def embed_one(text: str) -> list[float]:
    """Embed a single string. Thin wrapper around embed_texts."""
    return embed_texts([text])[0]
