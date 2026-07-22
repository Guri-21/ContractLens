from __future__ import annotations

import json
import logging
import os
import re
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from urllib.parse import urlparse

from .config import PIPELINE_CONFIG
from .redaction import redact

_logger = logging.getLogger(__name__)

_LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}


def _enforce_transport(base_url: str) -> None:
    """Reject plaintext HTTP to the LLM endpoint (localhost exempt for self-hosting)."""
    if not PIPELINE_CONFIG.get("llm_require_https", True):
        return
    parsed = urlparse(base_url)
    host = (parsed.hostname or "").lower()
    if parsed.scheme != "https" and host not in _LOCAL_HOSTS:
        raise RuntimeError(
            f"Refusing to send document content over insecure transport "
            f"({parsed.scheme}://{host}). Use https, or set LLM_REQUIRE_HTTPS=false "
            f"only for a trusted localhost model."
        )


def _safe_error_summary(error_body: str) -> str:
    """Extract only the error type/code from an LLM error body — never the
    echoed request content, which may contain confidential document text."""
    try:
        parsed = json.loads(error_body)
        err = parsed.get("error", parsed) if isinstance(parsed, dict) else {}
        if isinstance(err, dict):
            code = err.get("code") or err.get("type") or "unknown"
            return f"error_code={code}"
    except (json.JSONDecodeError, ValueError, AttributeError):
        pass
    return "error_code=unparseable"

_ENV_LOADED = False


def _load_dotenv_once() -> None:
    global _ENV_LOADED
    if _ENV_LOADED:
        return
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if env_path.exists():
        for raw in env_path.read_text(encoding="utf-8-sig", errors="replace").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            clean_value = value.strip().strip('"').strip("'")
            if clean_value:
                os.environ[key.strip().lstrip("\ufeff")] = clean_value
    _ENV_LOADED = True


def complete_json_batch(
    items: list[dict],
    prompt_template: str,
    result_key: str = "results",
    max_tokens: int | None = None,
) -> list[dict]:
    """Process multiple items in a single LLM call to reduce API round-trips.

    prompt_template must contain the literal string {ITEMS} which is replaced
    with a JSON array of the items. The LLM must return a JSON object with
    `result_key` containing a list of results in the same order as the input.

    Falls back to processing items one-by-one if the batch call fails.
    """
    if not items:
        return []
    items_json = json.dumps(items, ensure_ascii=False)
    prompt = prompt_template.replace("{ITEMS}", items_json)
    try:
        data = complete_json(prompt, max_tokens or 4096)
        results = data.get(result_key, [])
        if isinstance(results, list) and len(results) == len(items):
            return results
        _logger.warning("Batch LLM call returned %d results for %d items", len(results) if isinstance(results, list) else -1, len(items))
    except Exception as exc:
        _logger.warning("Batch LLM call failed (%d items): %s", len(items), exc)
    # Fallback: caller handles empty result
    return []


def complete_text(prompt: str, max_tokens: int | None = None) -> str:
    # Redact confidential identifiers before the prompt leaves the network,
    # then re-hydrate the model's response locally so callers see real values.
    mapping = None
    if PIPELINE_CONFIG.get("llm_redaction", True):
        prompt, mapping = redact(prompt)

    provider = PIPELINE_CONFIG["llm_provider"].lower()
    if provider == "claude":
        output = _complete_claude(prompt, max_tokens)
    elif provider == "groq":
        output = _complete_groq(prompt, max_tokens)
    else:
        raise ValueError(f"Unsupported LLM_PROVIDER: {provider}")

    return mapping.rehydrate(output) if mapping is not None else output


def complete_json(prompt: str, max_tokens: int | None = None) -> dict[str, Any]:
    text = complete_text(prompt, max_tokens)
    return parse_json_object(text)


def parse_json_object(text: str) -> dict[str, Any]:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            raise
        return json.loads(match.group(0))


def _complete_groq(prompt: str, max_tokens: int | None = None) -> str:
    _load_dotenv_once()
    api_keys = _get_groq_api_keys()
    if not api_keys:
        raise RuntimeError(
            "Missing GROQ_API_KEY/GROK_API_KEY. Optional fallback: GROQ_API_KEY_2."
        )

    base_url = PIPELINE_CONFIG["groq_base_url"].rstrip("/")
    _enforce_transport(base_url)
    payload = {
        "model": PIPELINE_CONFIG["groq_model"],
        "messages": [
            {
                "role": "system",
                "content": "You are ContractLens, a precise legal contract analysis engine.",
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0,
        "max_tokens": max_tokens or PIPELINE_CONFIG["groq_max_tokens"],
        "response_format": {"type": "json_object"} if _expects_json(prompt) else None,
    }
    payload = {key: value for key, value in payload.items() if value is not None}
    failures: list[str] = []
    for index, api_key in enumerate(api_keys, start=1):
        try:
            return _post_groq(base_url, api_key, payload, allow_json_retry=True)
        except GroqKeyExhaustedError as exc:
            failures.append(f"key {index}: {exc}")
            continue
    raise RuntimeError(f"Groq API error: all configured Groq API keys failed ({'; '.join(failures)})")


class GroqKeyExhaustedError(RuntimeError):
    """Raised when one Groq key should be skipped in favor of the next configured key."""


def _get_groq_api_keys() -> list[str]:
    seen: set[str] = set()
    keys: list[str] = []
    for env_name in (
        "GROQ_API_KEY",
        "GROK_API_KEY",
        "GROQ_API_KEY_2",
        "GROQ_API_KEY2",
        "GROK_API_KEY_2",
        "GROK_API_KEY2",
    ):
        value = os.getenv(env_name, "").strip()
        if value and value not in seen:
            seen.add(value)
            keys.append(value)
    return keys


def _post_groq(base_url: str, api_key: str, payload: dict[str, Any], allow_json_retry: bool, _attempt: int = 0) -> str:
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        f"{base_url}/chat/completions",
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "ContractLens-Pipeline/0.1",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            body = json.loads(response.read().decode("utf-8", errors="replace"))
            return body["choices"][0]["message"]["content"] or ""
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        if exc.code == 400 and allow_json_retry and "json_validate_failed" in error_body:
            retry_payload = {key: value for key, value in payload.items() if key != "response_format"}
            return _post_groq(base_url, api_key, retry_payload, allow_json_retry=False, _attempt=_attempt)
        if exc.code == 429 and _attempt < 3:
            wait = 2 ** _attempt
            _logger.info("Groq rate limited (429), retrying in %ds (attempt %d/3)", wait, _attempt + 1)
            time.sleep(wait)
            return _post_groq(base_url, api_key, payload, allow_json_retry, _attempt + 1)
        # Never surface the raw error body — it can echo the request content
        # (confidential document text). Log/raise only the error code.
        summary = _safe_error_summary(error_body)
        if _should_try_next_groq_key(exc.code, error_body):
            raise GroqKeyExhaustedError(f"HTTP {exc.code}: {summary}") from exc
        raise RuntimeError(f"Groq API error HTTP {exc.code}: {summary}") from exc


def _should_try_next_groq_key(status_code: int, error_body: str) -> bool:
    lowered = error_body.lower()
    return (
        status_code == 429
        or status_code in {401, 403}
        and any(token in lowered for token in ("quota", "limit", "rate", "exhaust", "invalid", "unauthorized"))
    )


def _complete_claude(prompt: str, max_tokens: int | None = None) -> str:
    _load_dotenv_once()
    try:
        import anthropic
    except ImportError as exc:
        raise RuntimeError("anthropic package is required for LLM_PROVIDER=claude") from exc

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("Missing ANTHROPIC_API_KEY for LLM_PROVIDER=claude")

    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model=PIPELINE_CONFIG["claude_model"],
        max_tokens=max_tokens or PIPELINE_CONFIG["claude_max_tokens"],
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text.strip()


def _expects_json(prompt: str) -> bool:
    lowered = prompt.lower()
    return "return only json" in lowered or "return json" in lowered
