import os
from dataclasses import dataclass
from pathlib import Path

from app.analysis_schemas import AnalysisMode

# Pipeline model configuration.
# To swap a model, change the environment variable instead of editing step code.


def _load_dotenv_once() -> None:
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return
    for raw in env_path.read_text(encoding="utf-8-sig", errors="replace").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        clean_value = value.strip().strip('"').strip("'")
        if clean_value:
            os.environ[key.strip().lstrip("\ufeff")] = clean_value


_load_dotenv_once()


@dataclass(frozen=True)
class ModePolicy:
    classificationBatchSize: int
    classifyOtherWithLlm: bool
    maxContradictionPairs: int
    contradictionBatchSize: int
    semanticRuleBatchSize: int
    autoRedlines: bool
    verifyHighRisk: bool
    maxRetries: int


_MODE_POLICIES = {
    AnalysisMode.FAST: ModePolicy(8, False, 10, 8, 8, False, False, 1),
    AnalysisMode.DEEP: ModePolicy(4, True, 30, 4, 4, True, True, 1),
}


def get_mode_policy(mode: AnalysisMode) -> ModePolicy:
    try:
        normalized = mode if isinstance(mode, AnalysisMode) else AnalysisMode(mode)
        return _MODE_POLICIES[normalized]
    except (KeyError, ValueError) as exc:
        raise ValueError(f"Unsupported analysis mode: {mode}") from exc

PIPELINE_CONFIG = {
    # Step 3: Clause Classification
    # backend: "huggingface" | "llm"
    "clause_classifier": {
        "backend": os.getenv("CLAUSE_CLASSIFIER_BACKEND", "llm"),
        "hf_model": os.getenv("CLAUSE_CLASSIFIER_MODEL", "LEDGAR_MODEL_TBD"),
        "hf_task": "text-classification",
        "top_k": 1,
    },
    "classify_other_with_llm": os.getenv("CLASSIFY_OTHER_WITH_LLM", "false").lower() == "true",
    "max_contradiction_pairs": int(os.getenv("MAX_CONTRADICTION_PAIRS", "30")),

    # Step 5: Contradiction Detection
    # backend: "huggingface" | "llm"
    "contradiction_detector": {
        "backend": os.getenv("CONTRADICTION_BACKEND", "llm"),
        "hf_model": os.getenv("CONTRADICTION_MODEL", "CONTRACTNLI_MODEL_TBD"),
        "hf_task": "zero-shot-classification",
        "labels": ["entailment", "neutral", "contradiction"],
    },

    # LLM provider settings used by all LLM-backed steps.
    # provider: "groq" | "claude"
    "llm_provider": os.getenv("LLM_PROVIDER", "groq"),

    # Groq is OpenAI-compatible and was the best benchmarked prototype model.
    "groq_model": os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
    "groq_base_url": os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1"),
    "groq_max_tokens": int(os.getenv("GROQ_MAX_TOKENS", "1024")),

    # Claude remains available as a fallback provider.
    "claude_model": os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6"),
    "claude_max_tokens": int(os.getenv("CLAUDE_MAX_TOKENS", "4096")),
}
