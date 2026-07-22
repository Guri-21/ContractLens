"""PII/entity redaction for LLM prompts.

The goal is confidentiality: replace high-signal identifiers in a prompt with
stable pseudonyms *before* the text leaves our network, keep a local mapping,
and re-hydrate the model's response so downstream storage still shows the real
values.

Design notes:
- Redaction is best-effort and layered. Regex handles structured identifiers
  (emails, phones, money, card/account numbers, IPs, URLs). If Microsoft
  Presidio is installed we additionally redact PERSON/ORG/LOCATION entities;
  if it is not, we degrade gracefully (like the ClamAV hook) rather than fail.
- Pseudonyms are consistent *within a single document/prompt* (the same email
  always maps to the same token) so the model can still reason about relations.
- The mapping never leaves the process; only the redacted text is sent.
"""
from __future__ import annotations

import logging
import re
from typing import Callable, Pattern

_logger = logging.getLogger(__name__)

# Ordered so that more specific patterns run before greedier ones.
_REGEX_RULES: list[tuple[str, Pattern[str]]] = [
    ("EMAIL", re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")),
    ("URL", re.compile(r"https?://[^\s\"'<>]+")),
    ("IP", re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")),
    # Payment card (13-16 digits, optionally separated) and long account numbers.
    ("CARD", re.compile(r"\b(?:\d[ \-]?){13,16}\b")),
    # Money: currency symbol or code followed by an amount.
    ("MONEY", re.compile(r"(?:(?:USD|INR|EUR|GBP|Rs\.?|₹|\$|€|£)\s?)[\d,]+(?:\.\d{1,2})?", re.IGNORECASE)),
    ("PHONE", re.compile(r"(?<!\w)(?:\+?\d{1,3}[\s\-]?)?(?:\(\d{2,4}\)[\s\-]?)?\d{3,4}[\s\-]?\d{4}(?!\w)")),
]


class RedactionMap:
    """Bidirectional map between real values and their pseudonyms for one prompt."""

    def __init__(self) -> None:
        self._to_token: dict[str, str] = {}
        self._to_value: dict[str, str] = {}
        self._counters: dict[str, int] = {}

    def token_for(self, label: str, value: str) -> str:
        if value in self._to_token:
            return self._to_token[value]
        self._counters[label] = self._counters.get(label, 0) + 1
        token = f"[{label}_{self._counters[label]}]"
        self._to_token[value] = token
        self._to_value[token] = value
        return token

    def rehydrate(self, text: str) -> str:
        """Replace every pseudonym in `text` with its original value."""
        if not text:
            return text
        # Replace longer tokens first to avoid partial collisions.
        for token in sorted(self._to_value, key=len, reverse=True):
            text = text.replace(token, self._to_value[token])
        return text

    def __len__(self) -> int:
        return len(self._to_value)


def _apply_presidio(text: str, mapping: RedactionMap) -> str:
    """Optionally redact named entities via Presidio. No-op if unavailable."""
    try:
        analyzer = _get_presidio_analyzer()
    except ImportError:
        return text
    if analyzer is None:
        return text
    try:
        results = analyzer.analyze(
            text=text,
            language="en",
            entities=["PERSON", "ORGANIZATION", "LOCATION", "NRP", "US_SSN", "IBAN_CODE"],
        )
        # Apply from the end of the string backwards so offsets stay valid.
        for res in sorted(results, key=lambda r: r.start, reverse=True):
            value = text[res.start : res.end]
            token = mapping.token_for(res.entity_type, value)
            text = text[: res.start] + token + text[res.end :]
        return text
    except Exception as exc:  # pragma: no cover - defensive
        _logger.warning("Presidio redaction skipped: %s", exc)
        return text


# Prefer larger models (better accuracy) but fall back to whatever is installed.
_SPACY_MODEL_PREFERENCE = ("en_core_web_lg", "en_core_web_md", "en_core_web_sm")

_PRESIDIO_ANALYZER = None
_PRESIDIO_INIT_FAILED = False


def _find_spacy_model() -> str | None:
    import importlib.util
    for model in _SPACY_MODEL_PREFERENCE:
        if importlib.util.find_spec(model) is not None:
            return model
    return None


def _get_presidio_analyzer():
    """Build (once) a Presidio analyzer wired to an installed spaCy model.
    Returns None if Presidio or a model is unavailable — callers degrade to
    regex-only redaction."""
    global _PRESIDIO_ANALYZER, _PRESIDIO_INIT_FAILED
    if _PRESIDIO_ANALYZER is not None or _PRESIDIO_INIT_FAILED:
        return _PRESIDIO_ANALYZER
    try:
        from presidio_analyzer import AnalyzerEngine
        from presidio_analyzer.nlp_engine import NlpEngineProvider
    except ImportError:
        raise
    model = _find_spacy_model()
    if model is None:
        _logger.warning(
            "Presidio installed but no spaCy model found; name/org redaction "
            "disabled. Install one, e.g.: python -m spacy download en_core_web_sm"
        )
        _PRESIDIO_INIT_FAILED = True
        return None
    try:
        provider = NlpEngineProvider(nlp_configuration={
            "nlp_engine_name": "spacy",
            "models": [{"lang_code": "en", "model_name": model}],
        })
        nlp_engine = provider.create_engine()
        _PRESIDIO_ANALYZER = AnalyzerEngine(nlp_engine=nlp_engine, supported_languages=["en"])
        _logger.info("Presidio entity redaction enabled (spaCy model: %s)", model)
    except Exception as exc:
        _logger.warning("Presidio init failed, using regex-only redaction: %s", exc)
        _PRESIDIO_INIT_FAILED = True
        return None
    return _PRESIDIO_ANALYZER


def redact(text: str) -> tuple[str, RedactionMap]:
    """Return (redacted_text, mapping). The mapping stays local; only the
    redacted text should be sent to a third-party LLM."""
    mapping = RedactionMap()
    if not text:
        return text, mapping

    def _replace(label: str) -> Callable[[re.Match[str]], str]:
        def _sub(match: re.Match[str]) -> str:
            return mapping.token_for(label, match.group(0))
        return _sub

    for label, pattern in _REGEX_RULES:
        text = pattern.sub(_replace(label), text)

    text = _apply_presidio(text, mapping)
    return text, mapping
