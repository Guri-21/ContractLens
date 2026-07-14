"""
Run this once before starting the pipeline.
Downloads and caches all HuggingFace models used by the pipeline.
After the first run, models are cached in ~/.cache/huggingface/ — no re-download needed.

Usage:
    python download_models.py
"""
from transformers import pipeline as hf_pipeline
import os, sys

# ── Edit these two lines when you know the exact model IDs ──────
CLAUSE_CLASSIFIER_MODEL  = os.getenv("CLAUSE_CLASSIFIER_MODEL",  "LEDGAR_MODEL_TBD")
CONTRADICTION_MODEL      = os.getenv("CONTRADICTION_MODEL",       "CONTRACTNLI_MODEL_TBD")
# ────────────────────────────────────────────────────────────────

MODELS = [
    ("Clause Classifier (LEDGAR)",        "text-classification",      CLAUSE_CLASSIFIER_MODEL),
    ("Contradiction Detector (ContractNLI)", "zero-shot-classification", CONTRADICTION_MODEL),
]

def download_all():
    for name, task, model_id in MODELS:
        if "TBD" in model_id:
            print(f"  [SKIP] {name} — model ID not set yet (set env var or edit this file)")
            continue
        print(f"  Downloading {name} ({model_id}) ...")
        try:
            hf_pipeline(task, model=model_id)
            print(f"  [OK] {name} cached.")
        except Exception as e:
            print(f"  [FAIL] {name}: {e}")
            sys.exit(1)

if __name__ == "__main__":
    print("ContractLens — downloading pipeline models")
    print("Models will be cached in ~/.cache/huggingface/\n")
    download_all()
    print("\nDone. You can now run the pipeline without internet access.")
