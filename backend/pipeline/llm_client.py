from __future__ import annotations

import json
import os
import re
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from .config import PIPELINE_CONFIG

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


def complete_text(prompt: str, max_tokens: int | None = None) -> str:
    provider = PIPELINE_CONFIG["llm_provider"].lower()
    if provider == "claude":
        return _complete_claude(prompt, max_tokens)
    if provider == "groq":
        return _complete_groq(prompt, max_tokens)
    raise ValueError(f"Unsupported LLM_PROVIDER: {provider}")


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
    api_key = os.getenv("GROQ_API_KEY") or os.getenv("GROK_API_KEY")
    if not api_key:
        raise RuntimeError("Missing GROQ_API_KEY or GROK_API_KEY for LLM_PROVIDER=groq")

    base_url = PIPELINE_CONFIG["groq_base_url"].rstrip("/")
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
    return _post_groq(base_url, api_key, payload, allow_json_retry=True)


def _post_groq(base_url: str, api_key: str, payload: dict[str, Any], allow_json_retry: bool) -> str:
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
        if exc.code == 429:
            wait_seconds = float(exc.headers.get("retry-after") or 2)
            time.sleep(wait_seconds)
            return _post_groq(base_url, api_key, payload, allow_json_retry)
        if exc.code == 400 and allow_json_retry and "json_validate_failed" in error_body:
            retry_payload = {key: value for key, value in payload.items() if key != "response_format"}
            return _post_groq(base_url, api_key, retry_payload, allow_json_retry=False)
        raise RuntimeError(f"Groq API error HTTP {exc.code}: {error_body[:500]}") from exc


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
