"""
ContractLens â€” Full Benchmark Runner
Run this once and walk away. Come back in 30-40 minutes.

Usage:
    python scripts/benchmark/run_benchmark_full.py

What it does (in order):
  1. Checks GPU / installs missing packages
  2. Downloads all 5 models (cached after first run)
  3. Runs clause type + risk classification benchmarks
  4. Saves results to benchmark_results.json + benchmark_log.txt
  5. Prints final winner table

Do NOT close the terminal. Minimise it and come back.
"""

import subprocess
import sys
import time
import json
import gc
import os
import traceback
from datetime import datetime
from pathlib import Path

LOG_PATH   = Path(__file__).parent / "benchmark_log.txt"
RESULT_PATH = Path(__file__).parent / "benchmark_results.json"
DEFAULT_TYPE_LIMIT = int(os.getenv("BENCHMARK_TYPE_LIMIT", "30"))
DEFAULT_RISK_LIMIT = int(os.getenv("BENCHMARK_RISK_LIMIT", "20"))

# â”€â”€ Logger â€” writes to screen AND file â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class Logger:
    def __init__(self, path: Path):
        self.f = open(path, "w", buffering=1)  # line-buffered

    def log(self, msg: str = ""):
        ts = datetime.now().strftime("%H:%M:%S")
        line = f"[{ts}] {msg}"
        print(line, flush=True)
        self.f.write(line + "\n")

    def close(self):
        self.f.close()

log = Logger(LOG_PATH)

# â”€â”€ Step 1: GPU check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def check_gpu():
    try:
        import torch
        if torch.cuda.is_available():
            name = torch.cuda.get_device_name(0)
            vram = torch.cuda.get_device_properties(0).total_memory / 1e9
            log.log(f"GPU: {name}  ({vram:.1f} GB VRAM)  â† will use this")
            return 0
        else:
            log.log("No GPU found â€” running on CPU (will be slower)")
            return -1
    except Exception:
        log.log("torch not installed yet â€” will install now")
        return -1

# â”€â”€ Step 2: Install packages if missing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

REQUIRED = ["transformers", "torch", "sentencepiece"]
OPTIONAL = ["accelerate"]

def install_if_missing():
    for pkg in REQUIRED:
        try:
            __import__(pkg if pkg != "torch" else "torch")
        except ImportError:
            log.log(f"Installing {pkg} ...")
            subprocess.check_call(
                [sys.executable, "-m", "pip", "install", pkg, "-q"]
            )
            log.log(f"{pkg} installed.")
    for pkg in OPTIONAL:
        try:
            __import__(pkg)
        except ImportError:
            log.log(f"Installing optional package {pkg} ...")
            try:
                subprocess.check_call(
                    [sys.executable, "-m", "pip", "install", pkg, "-q"]
                )
                log.log(f"{pkg} installed.")
            except subprocess.CalledProcessError as e:
                log.log(
                    f"Optional package {pkg} failed to install "
                    f"(exit code {e.returncode}). Continuing without it."
                )

# â”€â”€ Test data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

TEST_TYPE = [
    {"text": "All invoices shall be settled within 30 days from receipt. Late payments accrue interest at 1.5% per month.", "label": "payment"},
    {"text": "In no event shall either party's aggregate liability exceed total Fees paid in the preceding 12 months.", "label": "liability"},
    {"text": "This Agreement shall be governed by the laws of India. Disputes resolved by arbitration in Bengaluru.", "label": "governing_law"},
    {"text": "Vendor guarantees 99.5% platform uptime measured monthly, excluding scheduled maintenance.", "label": "SLA"},
    {"text": "Either party may terminate with 30 days written notice. All confidential data must be returned or destroyed.", "label": "termination"},
    {"text": "All intellectual property developed hereunder shall vest exclusively in the Client upon full payment.", "label": "IP"},
    {"text": "Each party shall maintain in strict confidence all Confidential Information and not disclose to third parties.", "label": "confidentiality"},
    {"text": "Neither party shall be liable for delays caused by circumstances beyond reasonable control including acts of God.", "label": "force_majeure"},
    {"text": "Client shall maintain general liability insurance of not less than INR 5 crores per occurrence.", "label": "insurance"},
    {"text": "Vendor warrants Services will be performed professionally consistent with industry standards for 90 days.", "label": "warranty"},
    {"text": "SLA breach exceeding 3 consecutive months entitles Client to a penalty of 10% of monthly fees.", "label": "penalty"},
    {"text": "Services include design, development, testing and deployment of the cloud analytics platform per Schedule A.", "label": "scope_of_work"},
]

TEST_RISK = [
    {"text": "Client shall remit payment within 90 days of invoice date. No interest shall accrue on late payments.", "label": "high"},
    {"text": "Vendor's total liability shall be unlimited for any breach of this Agreement.", "label": "critical"},
    {"text": "Either party may assign this Agreement to any third party without prior written consent.", "label": "high"},
    {"text": "This Agreement shall be governed by the laws of India.", "label": "low"},
    {"text": "All confidential information shall be returned within 30 days of termination.", "label": "low"},
    {"text": "Service credits for SLA breaches are specified in Exhibit B which is not attached.", "label": "high"},
    {"text": "Non-compete: Vendor shall not engage with any competitor globally for 10 years.", "label": "critical"},
    {"text": "Vendor warrants 99.9% uptime with service credits as detailed in Schedule A.", "label": "medium"},
]

TEST_TYPE.extend([
    {"text": "Fees are payable quarterly in arrears within forty five days of receipt of an undisputed invoice.", "label": "payment"},
    {"text": "The customer's sole remedy for downtime shall be service credits capped at the monthly platform fee.", "label": "liability"},
    {"text": "The parties submit all disputes to arbitration seated in Mumbai under Indian law.", "label": "governing_law"},
    {"text": "Severity 1 incidents must be acknowledged within fifteen minutes and resolved within four hours.", "label": "SLA"},
    {"text": "The customer may terminate the statement of work if the supplier materially breaches its obligations.", "label": "termination"},
    {"text": "Background intellectual property remains owned by the contributing party and is licensed only for project use.", "label": "IP"},
    {"text": "Confidential Information may be used solely to perform this Agreement and must be protected with reasonable care.", "label": "confidentiality"},
    {"text": "Neither party is responsible for failure caused by flood, war, pandemic, government action, or network outage beyond its control.", "label": "force_majeure"},
    {"text": "Supplier shall maintain cyber liability and professional indemnity insurance during the term.", "label": "insurance"},
    {"text": "Supplier warrants that deliverables will materially conform to the specifications for a period of sixty days.", "label": "warranty"},
    {"text": "For each missed milestone, service credits equal to five percent of the milestone fee shall apply.", "label": "penalty"},
    {"text": "The implementation includes discovery, configuration, migration, training, and production support activities.", "label": "scope_of_work"},
    {"text": "Invoices disputed in good faith may be withheld until the dispute is resolved by the parties.", "label": "payment"},
    {"text": "Except for confidentiality and fraud, aggregate liability is limited to amounts paid under this SOW.", "label": "liability"},
    {"text": "This order form is governed by Singapore law with exclusive jurisdiction in Singapore courts.", "label": "governing_law"},
    {"text": "Monthly availability below 99 percent triggers escalation and a root cause analysis report.", "label": "SLA"},
    {"text": "Upon expiration, supplier shall provide transition assistance for up to thirty days.", "label": "termination"},
    {"text": "Client receives all rights in custom software created specifically under this statement of work.", "label": "IP"},
])

TEST_RISK.extend([
    {"text": "Customer may delay payment for up to one hundred twenty days without interest or suspension rights.", "label": "high"},
    {"text": "Supplier has no liability of any kind, including for confidentiality breach or data loss.", "label": "critical"},
    {"text": "Either party may terminate for convenience by giving thirty days prior written notice.", "label": "medium"},
    {"text": "The agreement is governed by Indian law and disputes will be arbitrated in Bengaluru.", "label": "low"},
    {"text": "Supplier shall notify customer of security incidents within seventy two hours of discovery.", "label": "low"},
    {"text": "Service levels are governed by Schedule A, but Schedule A has not been attached to the SOW.", "label": "high"},
    {"text": "Supplier shall not provide similar services to any customer worldwide for five years after termination.", "label": "critical"},
    {"text": "Late delivery credits are capped at ten percent of the affected milestone fee.", "label": "medium"},
    {"text": "The supplier may assign this contract to an affiliate after giving written notice to customer.", "label": "medium"},
    {"text": "Customer may audit supplier systems at any time without notice and without reasonable limits.", "label": "high"},
    {"text": "The parties will cooperate in good faith to resolve invoice disputes within fifteen business days.", "label": "low"},
    {"text": "Supplier indemnifies customer for all third party intellectual property infringement claims.", "label": "medium"},
])

# â”€â”€ Models â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

TYPE_MODELS = [
    {
        "id": "mauro/bert-base-uncased-finetuned-clause-type",
        "task": "text-classification",
        "name": "BERT-clause-type",
    },
    {
        "id": "SalmanAbbasi/lexglue-ledgar-distilbert",
        "task": "text-classification",
        "name": "DistilBERT-LEDGAR",
    },
    {
        "id": "sileod/deberta-v3-large-tasksource-nli",
        "task": "zero-shot-classification",
        "name": "DeBERTa-NLI",
        "labels": ["payment","liability","confidentiality","SLA","termination",
                   "IP","governing_law","insurance","warranty","force_majeure",
                   "penalty","scope_of_work"],
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
        "name": "DeBERTa-NLI",
        "labels": ["low risk", "medium risk", "high risk", "critical risk"],
    },
]

# â”€â”€ Model runner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def normalise(raw: str, candidates: list | None = None) -> str:
    raw = raw.lower().replace("-", "_").replace(" ", "_")
    if candidates:
        for c in candidates:
            c_norm = c.lower().replace(" ", "_")
            if c_norm in raw or raw in c_norm:
                return c.split()[0]
    return raw.split("label_")[-1].split("_")[0]


def run_model(
    cfg: dict,
    test_set: list,
    device: int,
    model_index: int,
    model_total: int,
    task_name: str,
) -> dict:
    from transformers import pipeline as hf_pipeline
    import torch

    log.log(
        f"  [Overall {model_index}/{model_total}] {task_name} | "
        f"Model: {cfg['name']} ({cfg['id']})"
    )
    log.log(f"  Loading model: {cfg['id']}")
    t_load = time.time()

    try:
        pipe = hf_pipeline(cfg["task"], model=cfg["id"], device=device)
    except Exception:
        log.log("    GPU load failed, retrying on CPU ...")
        pipe = hf_pipeline(cfg["task"], model=cfg["id"], device=-1)

    load_sec = round(time.time() - t_load, 1)
    log.log(f"    Loaded in {load_sec}s. Running {len(test_set)} test clauses ...")

    correct, latencies = 0, []
    for item_index, item in enumerate(test_set, 1):
        t0 = time.time()
        try:
            if cfg["task"] == "zero-shot-classification":
                out = pipe(item["text"][:512], candidate_labels=cfg["labels"])
                pred = normalise(out["labels"][0], cfg["labels"])
            else:
                out = pipe(item["text"][:512], top_k=1)
                pred = normalise(out[0]["label"])
        except Exception as e:
            pred = "error"
            log.log(f"    Inference error: {e}")

        latencies.append(time.time() - t0)
        if pred == item["label"]:
            correct += 1
        running_accuracy = round(correct / item_index * 100, 1)
        log.log(
            f"    Progress {item_index}/{len(test_set)} "
            f"({round(item_index / len(test_set) * 100, 1)}%) | "
            f"expected={item['label']} predicted={pred} | "
            f"running_accuracy={running_accuracy}%"
        )

    del pipe
    gc.collect()
    try:
        torch.cuda.empty_cache()
    except Exception:
        pass

    accuracy = round(correct / len(test_set) * 100, 1)
    avg_lat  = round(sum(latencies) / len(latencies), 3)
    log.log(f"    Model complete. Accuracy: {accuracy}%  Avg latency: {avg_lat}s")
    return {
        "model": cfg["name"],
        "model_id": cfg["id"],
        "accuracy_pct": accuracy,
        "correct": correct,
        "total": len(test_set),
        "avg_latency_s": avg_lat,
        "load_time_s": load_sec,
    }

# â”€â”€ Results printer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def print_table(title: str, results: list):
    log.log("")
    log.log("=" * 68)
    log.log(f"  {title}")
    log.log("=" * 68)
    log.log(f"  {'Model':<30} {'Accuracy':>10} {'Latency':>10} {'Load':>8}")
    log.log(f"  {'-'*64}")
    if not results:
        log.log("  No results.")
        return
    best = max(results, key=lambda r: r["accuracy_pct"])
    for r in results:
        flag = " <-- BEST" if r["model"] == best["model"] else ""
        log.log(
            f"  {r['model']:<30} "
            f"{r['accuracy_pct']:>8.1f}%  "
            f"{r['avg_latency_s']:>8.3f}s  "
            f"{r['load_time_s']:>6.1f}s"
            f"{flag}"
        )


# â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def main():
    t_start = time.time()
    log.log("=" * 68)
    log.log("  ContractLens Classifier Benchmark â€” STARTED")
    log.log(f"  Log file: {LOG_PATH}")
    log.log("=" * 68)

    # 1. Install deps
    log.log("\n[1/4] Checking dependencies ...")
    install_if_missing()

    # 2. GPU
    log.log("\n[2/4] Checking GPU ...")
    device = check_gpu()

    type_limit = max(1, min(DEFAULT_TYPE_LIMIT, len(TEST_TYPE)))
    risk_limit = max(1, min(DEFAULT_RISK_LIMIT, len(TEST_RISK)))
    type_test_set = TEST_TYPE[:type_limit]
    risk_test_set = TEST_RISK[:risk_limit]
    log.log(
        f"\nQuick sample mode: using {type_limit}/{len(TEST_TYPE)} clause-type "
        f"examples and {risk_limit}/{len(TEST_RISK)} risk examples."
    )
    log.log(
        "Set BENCHMARK_TYPE_LIMIT and BENCHMARK_RISK_LIMIT to smaller values "
        "for a faster smoke run, or larger values when more examples are available."
    )

    # 3. Run type classification models
    log.log(f"\n[3/4] CLAUSE TYPE CLASSIFICATION ({len(type_test_set)} clauses x {len(TYPE_MODELS)} models)")
    type_results = []
    for i, cfg in enumerate(TYPE_MODELS, 1):
        log.log(f"\n  Model {i}/{len(TYPE_MODELS)}: {cfg['name']}")
        try:
            result = run_model(
                cfg,
                type_test_set,
                device,
                i,
                len(TYPE_MODELS) + len(RISK_MODELS),
                "Clause type classification",
            )
            type_results.append(result)
        except Exception:
            log.log(f"  [FAILED] {cfg['name']}:\n{traceback.format_exc()}")

    # 4. Run risk classification models
    log.log(f"\n[4/4] RISK LEVEL CLASSIFICATION ({len(risk_test_set)} clauses x {len(RISK_MODELS)} models)")
    risk_results = []
    for i, cfg in enumerate(RISK_MODELS, 1):
        log.log(f"\n  Model {i}/{len(RISK_MODELS)}: {cfg['name']}")
        try:
            result = run_model(
                cfg,
                risk_test_set,
                device,
                len(TYPE_MODELS) + i,
                len(TYPE_MODELS) + len(RISK_MODELS),
                "Risk level classification",
            )
            risk_results.append(result)
        except Exception:
            log.log(f"  [FAILED] {cfg['name']}:\n{traceback.format_exc()}")

    # Save JSON before final pretty printing so results survive terminal issues.
    output = {
        "run_at": datetime.now().isoformat(),
        "device": torch.cuda.get_device_name(0) if device == 0 else "CPU",
        "type_classification": type_results,
        "risk_classification": risk_results,
    }
    RESULT_PATH.write_text(json.dumps(output, indent=2))

    # Print final tables
    print_table("TASK 1 - CLAUSE TYPE CLASSIFICATION", type_results)
    print_table("TASK 2 - RISK LEVEL CLASSIFICATION", risk_results)

    elapsed = round((time.time() - t_start) / 60, 1)
    log.log(f"\n  Total time: {elapsed} minutes")
    log.log(f"  Results saved to: {RESULT_PATH}")
    log.log("  BENCHMARK COMPLETE")
    log.close()


if __name__ == "__main__":
    import torch
    main()
