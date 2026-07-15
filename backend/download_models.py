"""
Download and cache all Hugging Face models used by the benchmark.

Usage:
    python download_models.py

The Hugging Face client shows file-level progress bars while downloading.
After the first run, models are cached under the normal Hugging Face cache
folder and future runs should be much faster.
"""

import os
import sys
import time

from huggingface_hub import snapshot_download


os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "0")

MODELS = [
    {
        "name": "BERT clause type",
        "id": "mauro/bert-base-uncased-finetuned-clause-type",
    },
    {
        "name": "DistilBERT LEDGAR",
        "id": "SalmanAbbasi/lexglue-ledgar-distilbert",
    },
    {
        "name": "DeBERTa NLI",
        "id": "sileod/deberta-v3-large-tasksource-nli",
    },
    {
        "name": "Risk scorer",
        "id": "AnkushRaheja/Cls_Class_Risk_Scr",
    },
    {
        "name": "ModernBERT unfair ToS",
        "id": "Agreemind/modernbert-unfair-tos",
    },
]


def download_all() -> None:
    total = len(MODELS)
    started = time.time()

    for index, model in enumerate(MODELS, 1):
        model_started = time.time()
        print("=" * 72, flush=True)
        print(
            f"[{index}/{total}] Downloading {model['name']}: {model['id']}",
            flush=True,
        )
        print("Hugging Face file progress will appear below if files are missing.", flush=True)

        try:
            local_path = snapshot_download(
                repo_id=model["id"],
                resume_download=True,
            )
        except Exception as exc:
            print(f"[FAILED] {model['id']}: {exc}", flush=True)
            sys.exit(1)

        elapsed = round(time.time() - model_started, 1)
        print(f"[OK] {model['name']} cached in {elapsed}s", flush=True)
        print(f"     Cache path: {local_path}", flush=True)

    total_elapsed = round((time.time() - started) / 60, 1)
    print("=" * 72, flush=True)
    print(f"All {total} benchmark models are cached. Total time: {total_elapsed} min", flush=True)


if __name__ == "__main__":
    print("ContractLens - downloading benchmark models", flush=True)
    print("Models are cached in the Hugging Face cache folder.", flush=True)
    download_all()
