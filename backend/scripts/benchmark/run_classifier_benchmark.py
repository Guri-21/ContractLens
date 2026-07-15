"""
Benchmark: Clause Type Classification + Risk Level Classification
Compares fine-tuned HuggingFace models against each other.

Usage:
    python -m scripts.benchmark.run_classifier_benchmark

GPU recommended (4GB+ VRAM). Falls back to CPU automatically.
Models are loaded one at a time to stay within VRAM limits.
"""
import time
import json
import os
import gc
import torch
from pathlib import Path

# ── Device setup ────────────────────────────────────────────────
DEVICE = 0 if torch.cuda.is_available() else -1
DEVICE_NAME = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"
print(f"\nRunning on: {DEVICE_NAME}")

# ── Ground truth test set ────────────────────────────────────────
# Source: shared/mock-data/clauses.json + hand-labelled CUAD samples
TEST_CLAUSES_TYPE = [
    {
        "text": "All invoices shall be settled within 30 (thirty) days from the date of receipt of invoice. Late payments shall accrue interest at 1.5% per month.",
        "label": "payment"
    },
    {
        "text": "In no event shall either party's aggregate liability exceed the total Fees paid by Client in the 12 months preceding the claim.",
        "label": "liability"
    },
    {
        "text": "This Agreement shall be governed by the laws of India. Any dispute shall be resolved by arbitration in Bengaluru under the Arbitration and Conciliation Act, 1996.",
        "label": "governing_law"
    },
    {
        "text": "Vendor guarantees 99.5% platform uptime measured monthly. Downtime excludes scheduled maintenance windows.",
        "label": "SLA"
    },
    {
        "text": "Either party may terminate this Agreement with 30 days written notice. Upon termination, all confidential information must be returned or destroyed.",
        "label": "termination"
    },
    {
        "text": "All intellectual property developed under this Agreement shall vest exclusively in the Client upon full payment of Fees.",
        "label": "IP"
    },
    {
        "text": "Each party shall maintain in strict confidence all Confidential Information disclosed by the other party and shall not disclose it to any third party.",
        "label": "confidentiality"
    },
    {
        "text": "Neither party shall be liable for delays caused by circumstances beyond their reasonable control including acts of God, war, or government action.",
        "label": "force_majeure"
    },
    {
        "text": "Client shall maintain general liability insurance of not less than INR 5 crores per occurrence throughout the term.",
        "label": "insurance"
    },
    {
        "text": "Vendor warrants that the Services will be performed in a professional manner consistent with industry standards for a period of 90 days.",
        "label": "warranty"
    },
    {
        "text": "In the event of SLA breach exceeding 3 consecutive months, Client may claim a penalty of 10% of monthly fees.",
        "label": "penalty"
    },
    {
        "text": "Services include design, development, testing and deployment of the cloud analytics platform as specified in Schedule A.",
        "label": "scope_of_work"
    },
]

TEST_CLAUSES_RISK = [
    {
        "text": "Client shall remit payment within 90 days of invoice date. No interest shall accrue on late payments.",
        "label": "high"
    },
    {
        "text": "Vendor's total liability shall be unlimited for any breach of this Agreement.",
        "label": "critical"
    },
    {
        "text": "Either party may assign this Agreement to any third party without prior written consent of the other party.",
        "label": "high"
    },
    {
        "text": "This Agreement shall be governed by the laws of India.",
        "label": "low"
    },
    {
        "text": "All confidential information shall be returned within 30 days of termination.",
        "label": "low"
    },
    {
        "text": "Service credits for SLA breaches are specified in Exhibit B which is not attached to this Agreement.",
        "label": "high"
    },
    {
        "text": "Non-compete: Vendor shall not engage with any competitor of Client globally for a period of 10 years.",
        "label": "critical"
    },
    {
        "text": "Vendor warrants 99.9% uptime with service credits as detailed in Schedule A.",
        "label": "medium"
    },
]

# ── Models to benchmark ──────────────────────────────────────────
TYPE_MODELS = [
    {
        "id": "mauro/bert-base-uncased-finetuned-clause-type",
        "task": "text-classification",
        "name": "BERT-clause-type (CUAD)",
    },
    {
        "id": "SalmanAbbasi/lexglue-ledgar-distilbert",
        "task": "text-classification",
        "name": "DistilBERT-LEDGAR",
    },
    {
        "id": "sileod/deberta-v3-large-tasksource-nli",
        "task": "zero-shot-classification",
        "name": "DeBERTa-NLI (zero-shot)",
        "candidate_labels": [
            "payment", "liability", "confidentiality", "SLA",
            "termination", "IP", "governing_law", "insurance",
            "warranty", "force_majeure", "penalty", "scope_of_work",
        ],
    },
]

RISK_MODELS = [
    {
        "id": "AnkushRaheja/Cls_Class_Risk_Scr",
        "task": "text-classification",
        "name": "Risk-Scorer",
    },
    {
        "id": "Agreemind/modernbert-unfair-tos",
        "task": "text-classification",
        "name": "ModernBERT-UnfairToS",
    },
    {
        "id": "sileod/deberta-v3-large-tasksource-nli",
        "task": "zero-shot-classification",
        "name": "DeBERTa-NLI (zero-shot)",
        "candidate_labels": ["low risk", "medium risk", "high risk", "critical risk"],
    },
]

# ── Benchmark runner ─────────────────────────────────────────────

def normalise(label: str, candidates: list[str] | None = None) -> str:
    label = label.lower().replace("-", "_").replace(" ", "_")
    if candidates:
        for c in candidates:
            if c.replace(" ", "_") in label or label in c.replace(" ", "_"):
                return c.split()[0]  # e.g. "high risk" → "high"
    return label.split("_")[0] if "_" in label else label


def run_model(model_cfg: dict, test_set: list[dict]) -> dict:
    from transformers import pipeline as hf_pipeline

    print(f"\n  Loading {model_cfg['name']} ({model_cfg['id']}) ...")
    t_load = time.time()

    pipe = hf_pipeline(
        model_cfg["task"],
        model=model_cfg["id"],
        device=DEVICE,
    )
    load_time = time.time() - t_load
    print(f"  Loaded in {load_time:.1f}s")

    correct = 0
    latencies = []

    for item in test_set:
        t0 = time.time()
        if model_cfg["task"] == "zero-shot-classification":
            out = pipe(item["text"][:512], candidate_labels=model_cfg["candidate_labels"])
            pred = normalise(out["labels"][0], model_cfg["candidate_labels"])
        else:
            out = pipe(item["text"][:512], top_k=1)
            pred = normalise(out[0]["label"])

        latencies.append(time.time() - t0)
        if pred == item["label"]:
            correct += 1

    accuracy = correct / len(test_set) * 100
    avg_latency = sum(latencies) / len(latencies)

    # Free VRAM before next model
    del pipe
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

    return {
        "model": model_cfg["name"],
        "accuracy": accuracy,
        "correct": correct,
        "total": len(test_set),
        "avg_latency_s": round(avg_latency, 3),
        "load_time_s": round(load_time, 1),
    }


def print_table(title: str, results: list[dict]) -> None:
    print(f"\n{'═'*65}")
    print(f"  {title}")
    print(f"{'═'*65}")
    print(f"  {'Model':<38} {'Accuracy':>9} {'Latency':>9} {'Load':>6}")
    print(f"  {'-'*62}")
    best = max(results, key=lambda r: r["accuracy"])
    for r in results:
        flag = " ◀ BEST" if r == best else ""
        print(
            f"  {r['model']:<38} "
            f"{r['accuracy']:>7.1f}%  "
            f"{r['avg_latency_s']:>6.3f}s  "
            f"{r['load_time_s']:>4.1f}s"
            f"{flag}"
        )


# ── Main ─────────────────────────────────────────────────────────

def main():
    print("\n" + "═"*65)
    print("  ContractLens — Classifier Benchmark")
    print(f"  Device: {DEVICE_NAME}")
    print(f"  Type test set: {len(TEST_CLAUSES_TYPE)} clauses")
    print(f"  Risk test set: {len(TEST_CLAUSES_RISK)} clauses")
    print("═"*65)

    type_results = []
    for cfg in TYPE_MODELS:
        try:
            result = run_model(cfg, TEST_CLAUSES_TYPE)
            type_results.append(result)
        except Exception as e:
            print(f"  [SKIP] {cfg['name']}: {e}")

    risk_results = []
    for cfg in RISK_MODELS:
        try:
            result = run_model(cfg, TEST_CLAUSES_RISK)
            risk_results.append(result)
        except Exception as e:
            print(f"  [SKIP] {cfg['name']}: {e}")

    print_table("TASK 1 — CLAUSE TYPE CLASSIFICATION", type_results)
    print_table("TASK 2 — RISK LEVEL CLASSIFICATION", risk_results)

    # Save results to JSON
    output = {"type_classification": type_results, "risk_classification": risk_results}
    out_path = Path(__file__).parent / "benchmark_results.json"
    out_path.write_text(json.dumps(output, indent=2))
    print(f"\n  Full results saved to: {out_path}")
    print("═"*65 + "\n")


if __name__ == "__main__":
    main()
