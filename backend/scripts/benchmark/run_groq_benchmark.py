"""
ContractLens Groq benchmark runner.

Runs the same curated clause-type and risk examples used by run_benchmark_full.py
against Groq-hosted chat models.

Usage:
    python scripts/benchmark/run_groq_benchmark.py

Optional:
    set GROQ_BENCHMARK_MODELS=llama-3.3-70b-versatile,openai/gpt-oss-20b
    set BENCHMARK_TYPE_LIMIT=30
    set BENCHMARK_RISK_LIMIT=20
"""

from __future__ import annotations

import json
import os
import re
import time
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any

from run_benchmark_full import TEST_RISK, TEST_TYPE

ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = ROOT / ".env"
LOG_PATH = Path(__file__).with_name("groq_benchmark_log.txt")
RESULT_PATH = Path(__file__).with_name("groq_benchmark_results.json")

DEFAULT_BASE_URL = "https://api.groq.com/openai/v1"
DEFAULT_MODELS = [
    "llama-3.3-70b-versatile",
    "openai/gpt-oss-20b",
    "qwen/qwen3-32b",
]
TYPE_LABELS = [
    "payment",
    "liability",
    "confidentiality",
    "SLA",
    "termination",
    "IP",
    "governing_law",
    "insurance",
    "warranty",
    "force_majeure",
    "penalty",
    "scope_of_work",
]
RISK_LABELS = ["low", "medium", "high", "critical"]


class Logger:
    def __init__(self, path: Path) -> None:
        self.file = path.open("w", encoding="utf-8", buffering=1)

    def log(self, message: str = "") -> None:
        line = f"[{datetime.now().strftime('%H:%M:%S')}] {message}"
        print(line, flush=True)
        self.file.write(line + "\n")

    def close(self) -> None:
        self.file.close()


log = Logger(LOG_PATH)


def load_dotenv(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw in path.read_text(encoding="utf-8-sig", errors="replace").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip().lstrip("\ufeff")] = value.strip().strip('"').strip("'")
    return values


def get_config() -> tuple[str, str, list[str], int, int]:
    env_file = load_dotenv(ENV_PATH)
    api_key = (
        os.getenv("GROQ_API_KEY")
        or os.getenv("GROK_API_KEY")
        or env_file.get("GROQ_API_KEY")
        or env_file.get("GROK_API_KEY")
        or ""
    )
    base_url = (
        os.getenv("GROQ_BASE_URL")
        or env_file.get("GROQ_BASE_URL")
        or DEFAULT_BASE_URL
    ).rstrip("/")
    raw_models = os.getenv("GROQ_BENCHMARK_MODELS", "")
    models = [m.strip() for m in raw_models.split(",") if m.strip()] or DEFAULT_MODELS
    type_limit = max(1, min(int(os.getenv("BENCHMARK_TYPE_LIMIT", "30")), len(TEST_TYPE)))
    risk_limit = max(1, min(int(os.getenv("BENCHMARK_RISK_LIMIT", "20")), len(TEST_RISK)))
    return api_key, base_url, models, type_limit, risk_limit


def parse_json_object(text: str) -> dict[str, Any]:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            raise
        return json.loads(match.group(0))


def normalize_label(label: str, allowed: list[str]) -> str:
    raw = label.strip().lower().replace("-", "_").replace(" ", "_")
    aliases = {
        "service_level": "SLA",
        "service_level_agreement": "SLA",
        "sla": "SLA",
        "intellectual_property": "IP",
        "ip": "IP",
        "governing law": "governing_law",
        "force_majeure": "force_majeure",
        "scope": "scope_of_work",
        "scope_of_services": "scope_of_work",
    }
    raw = aliases.get(raw, raw)
    for item in allowed:
        if item.lower() == raw.lower():
            return item
    return raw


def groq_chat(
    base_url: str,
    api_key: str,
    model: str,
    messages: list[dict[str, str]],
    max_tokens: int = 48,
    use_json_mode: bool = True,
) -> tuple[str, dict[str, Any], dict[str, str]]:
    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0,
        "max_tokens": max_tokens,
    }
    if use_json_mode:
        payload["response_format"] = {"type": "json_object"}
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        f"{base_url}/chat/completions",
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "ContractLens-Groq-Benchmark/0.1",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            headers = dict(response.headers)
            body = json.loads(response.read().decode("utf-8", errors="replace"))
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        if exc.code == 429:
            retry_after = exc.headers.get("retry-after")
            wait_seconds = float(retry_after) if retry_after else 10.0
            log.log(f"    Rate limited. Sleeping {wait_seconds}s then retrying ...")
            time.sleep(wait_seconds)
            return groq_chat(base_url, api_key, model, messages, max_tokens, use_json_mode)
        if exc.code == 400 and use_json_mode and "json_validate_failed" in error_body:
            return groq_chat(base_url, api_key, model, messages, max_tokens, False)
        raise RuntimeError(f"HTTP {exc.code}: {error_body[:500]}") from exc
    content = body["choices"][0]["message"]["content"]
    return content, body.get("usage", {}), headers


def extract_label(content: str, allowed: list[str]) -> str:
    try:
        parsed = parse_json_object(content)
        return normalize_label(str(parsed.get("label", "")), allowed)
    except Exception:
        raw = content.strip().lower().replace("-", "_").replace(" ", "_")
        for label in allowed:
            normalized = label.lower().replace(" ", "_")
            if re.search(rf"\b{re.escape(normalized)}\b", raw):
                return label
        return normalize_label(content, allowed)


def classify_clause(base_url: str, api_key: str, model: str, text: str) -> tuple[str, dict[str, Any]]:
    labels = ", ".join(TYPE_LABELS)
    content, usage, _headers = groq_chat(
        base_url,
        api_key,
        model,
        [
            {
                "role": "system",
                "content": (
                    "You classify legal contract clauses. Return only JSON with key "
                    f'"label". The label must be exactly one of: {labels}.'
                ),
            },
            {"role": "user", "content": text},
        ],
    )
    return extract_label(content, TYPE_LABELS), usage


def classify_risk(base_url: str, api_key: str, model: str, text: str) -> tuple[str, dict[str, Any]]:
    content, usage, _headers = groq_chat(
        base_url,
        api_key,
        model,
        [
            {
                "role": "system",
                "content": (
                    "You classify contract risk level. Return only JSON with key "
                    '"label". The label must be exactly one of: low, medium, high, critical. '
                    "Low means standard/acceptable. Medium means negotiable or moderate. "
                    "High means materially unfavorable or missing dependency. Critical means "
                    "severe exposure such as unlimited liability or extreme non-compete."
                ),
            },
            {"role": "user", "content": text},
        ],
    )
    return extract_label(content, RISK_LABELS), usage


def run_task(
    task_name: str,
    model: str,
    examples: list[dict[str, str]],
    base_url: str,
    api_key: str,
) -> dict[str, Any]:
    classifier = classify_clause if task_name == "clause_type" else classify_risk
    correct = 0
    latencies: list[float] = []
    total_tokens = 0
    predictions = []
    for index, item in enumerate(examples, 1):
        started = time.time()
        try:
            prediction, usage = classifier(base_url, api_key, model, item["text"])
        except Exception as exc:
            prediction = "error"
            usage = {}
            log.log(f"    Error on {task_name} {index}/{len(examples)}: {exc}")
        elapsed = time.time() - started
        latencies.append(elapsed)
        total_tokens += int(usage.get("total_tokens") or 0)
        is_correct = prediction == item["label"]
        correct += 1 if is_correct else 0
        predictions.append(
            {
                "text": item["text"],
                "expected": item["label"],
                "predicted": prediction,
                "correct": is_correct,
                "latency_s": round(elapsed, 3),
                "usage": usage,
            }
        )
        log.log(
            f"    {task_name} progress {index}/{len(examples)} "
            f"({round(index / len(examples) * 100, 1)}%) | "
            f"expected={item['label']} predicted={prediction} | "
            f"running_accuracy={round(correct / index * 100, 1)}%"
        )
    accuracy = round(correct / len(examples) * 100, 1)
    return {
        "model": model,
        "accuracy_pct": accuracy,
        "correct": correct,
        "total": len(examples),
        "avg_latency_s": round(sum(latencies) / len(latencies), 3),
        "total_tokens": total_tokens,
        "predictions": predictions,
    }


def print_table(title: str, results: list[dict[str, Any]]) -> None:
    log.log("")
    log.log("=" * 78)
    log.log(title)
    log.log("=" * 78)
    log.log(f"{'Model':<32} {'Accuracy':>10} {'Latency':>10} {'Tokens':>10}")
    best = max(results, key=lambda item: item["accuracy_pct"]) if results else None
    for item in results:
        flag = " <-- BEST" if best and item["model"] == best["model"] else ""
        log.log(
            f"{item['model']:<32} "
            f"{item['accuracy_pct']:>8.1f}% "
            f"{item['avg_latency_s']:>9.3f}s "
            f"{item['total_tokens']:>10}"
            f"{flag}"
        )


def main() -> None:
    started = time.time()
    api_key, base_url, models, type_limit, risk_limit = get_config()
    if not api_key:
        raise SystemExit("Missing GROQ_API_KEY or GROK_API_KEY in backend/.env")
    type_examples = TEST_TYPE[:type_limit]
    risk_examples = TEST_RISK[:risk_limit]
    log.log("=" * 78)
    log.log("ContractLens Groq Benchmark - STARTED")
    log.log(f"Base URL: {base_url}")
    log.log(f"Models: {', '.join(models)}")
    log.log(f"Examples: {len(type_examples)} clause-type, {len(risk_examples)} risk")
    log.log(f"Log file: {LOG_PATH}")
    log.log("=" * 78)

    type_results = []
    risk_results = []
    for model_index, model in enumerate(models, 1):
        log.log("")
        log.log(f"[{model_index}/{len(models)}] Model: {model}")
        log.log("  Clause type classification")
        type_results.append(run_task("clause_type", model, type_examples, base_url, api_key))
        log.log("  Risk level classification")
        risk_results.append(run_task("risk_level", model, risk_examples, base_url, api_key))

    output = {
        "run_at": datetime.now().isoformat(),
        "base_url": base_url,
        "type_limit": len(type_examples),
        "risk_limit": len(risk_examples),
        "type_classification": type_results,
        "risk_classification": risk_results,
    }
    RESULT_PATH.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print_table("TASK 1 - CLAUSE TYPE CLASSIFICATION", type_results)
    print_table("TASK 2 - RISK LEVEL CLASSIFICATION", risk_results)
    log.log("")
    log.log(f"Total time: {round((time.time() - started) / 60, 2)} minutes")
    log.log(f"Results saved to: {RESULT_PATH}")
    log.log("GROQ BENCHMARK COMPLETE")
    log.close()


if __name__ == "__main__":
    main()
