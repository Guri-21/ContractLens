import json
import urllib.error
from io import BytesIO

from pipeline import llm_client


class _FakeResponse:
    def __init__(self, body):
        self._body = body

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self):
        return json.dumps(self._body).encode("utf-8")


def _http_error(code: int, body: str = "rate limit"):
    return urllib.error.HTTPError(
        url="https://api.groq.com/openai/v1/chat/completions",
        code=code,
        msg="error",
        hdrs={},
        fp=BytesIO(body.encode("utf-8")),
    )


def test_groq_uses_second_key_when_primary_is_rate_limited(monkeypatch):
    calls = []

    monkeypatch.setenv("GROQ_API_KEY", "primary-key")
    monkeypatch.setenv("GROQ_API_KEY_2", "fallback-key")
    monkeypatch.delenv("GROQ_API_KEY2", raising=False)
    monkeypatch.delenv("GROK_API_KEY", raising=False)
    monkeypatch.delenv("GROK_API_KEY_2", raising=False)
    monkeypatch.setitem(llm_client.PIPELINE_CONFIG, "groq_model", "llama-test")
    monkeypatch.setitem(llm_client.PIPELINE_CONFIG, "groq_base_url", "https://api.groq.com/openai/v1")
    monkeypatch.setitem(llm_client.PIPELINE_CONFIG, "groq_max_tokens", 64)
    monkeypatch.setattr(llm_client, "_ENV_LOADED", True)

    def fake_urlopen(request, timeout):
        calls.append(request.headers["Authorization"])
        if len(calls) == 1:
            raise _http_error(429)
        return _FakeResponse({"choices": [{"message": {"content": "fallback ok"}}]})

    monkeypatch.setattr(llm_client.urllib.request, "urlopen", fake_urlopen)

    assert llm_client._complete_groq("plain text", max_tokens=12) == "fallback ok"
    assert calls == ["Bearer primary-key", "Bearer fallback-key"]


def test_groq_reports_all_configured_keys_when_fallbacks_fail(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "primary-key")
    monkeypatch.setenv("GROQ_API_KEY_2", "fallback-key")
    monkeypatch.setattr(llm_client, "_ENV_LOADED", True)
    monkeypatch.setattr(
        llm_client.urllib.request,
        "urlopen",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(_http_error(429, "quota exceeded")),
    )

    try:
        llm_client._complete_groq("plain text", max_tokens=12)
    except RuntimeError as exc:
        assert "all configured Groq API keys failed" in str(exc)
        assert "key 1" in str(exc)
        assert "key 2" in str(exc)
    else:
        raise AssertionError("expected Groq fallback failure")
