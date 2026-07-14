import os

# ══════════════════════════════════════════════════════════════════
#  PIPELINE MODEL CONFIGURATION
#  To swap a model: change the env var OR edit the default string.
#  No other code changes needed — each step reads this at runtime.
# ══════════════════════════════════════════════════════════════════

PIPELINE_CONFIG = {

    # ── Step 3: Clause Classification ─────────────────────────────
    # backend: "huggingface" | "claude"
    # hf_model: exact HuggingFace model ID (user will fill in)
    "clause_classifier": {
        "backend":   os.getenv("CLAUSE_CLASSIFIER_BACKEND",  "huggingface"),
        "hf_model":  os.getenv("CLAUSE_CLASSIFIER_MODEL",    "LEDGAR_MODEL_TBD"),
        "hf_task":   "text-classification",
        "top_k":     1,
    },

    # ── Step 5: Contradiction Detection ───────────────────────────
    # backend: "huggingface" | "claude"
    "contradiction_detector": {
        "backend":   os.getenv("CONTRADICTION_BACKEND",       "huggingface"),
        "hf_model":  os.getenv("CONTRADICTION_MODEL",         "CONTRACTNLI_MODEL_TBD"),
        "hf_task":   "zero-shot-classification",
        # candidate labels the NLI model maps to
        "labels":    ["entailment", "neutral", "contradiction"],
    },

    # ── Claude settings (used by all Claude-backed steps) ─────────
    "claude_model":      os.getenv("CLAUDE_MODEL",      "claude-sonnet-4-6"),
    "claude_max_tokens": int(os.getenv("CLAUDE_MAX_TOKENS", "4096")),
}
