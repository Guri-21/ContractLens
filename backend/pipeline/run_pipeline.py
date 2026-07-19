"""
Top-level pipeline orchestrator.
Called by the backend API: runAnalysisPipeline(documents, playbookId, countryCode)
Each step is independently testable — import any step module directly for unit tests.
"""
from .step01_parse      import parse_document
from .step02_segment    import segment_clauses
from .step03_classify   import classify_clauses
from .step04_references import extract_references
from .step05_contradict import detect_contradictions
from .step06_refusal    import apply_refusal
from .step07_playbook   import validate_playbook
from .step08_risk       import score_risk
from .step09_redline    import generate_redlines
from .step10_report     import generate_report


def _select_primary_pair(documents: list[dict]) -> tuple[dict, dict] | None:
    msa_document = next((document for document in documents if document["type"] == "MSA"), None)
    sow_document = next((document for document in documents if document["type"] == "SOW"), None)
    if msa_document is None or sow_document is None:
        return None
    return msa_document, sow_document


def run_analysis_pipeline(
    documents: list[dict],
    playbook_rules: list[str],
    country_code: str = "IN",
) -> dict:
    """
    documents: [
      {
        "id": str,           # unique document ID
        "name": str,         # display name e.g. "MSA_v2.pdf"
        "type": str,         # "MSA" | "SOW" | "SLA" | "NDA" | "EXHIBIT" | ...
        "file_path": str,    # absolute path to uploaded file
      }, ...
    ]
    Returns: full analysis result dict with clauses + findings + report.
    """
    uploaded_names = [d["name"] for d in documents]
    all_clauses: list[dict] = []

    # ── Steps 1-3: parse + segment + classify (per document) ────
    for doc in documents:
        pages = parse_document(doc["file_path"])
        clauses = segment_clauses(pages, doc["id"], doc["name"], doc["type"])
        clauses = classify_clauses(clauses)
        all_clauses.extend(clauses)

    # ── Step 4: reference extraction across ALL documents ────────
    # Must run after all docs so SOW→MSA section refs can resolve to real clause IDs
    all_clauses = extract_references(all_clauses)

    # ── Step 5: cross-document contradiction detection ───────────
    refusal_findings = apply_refusal(all_clauses, uploaded_names)
    refused_clause_ids = {finding["clauseId"] for finding in refusal_findings}
    eligible_clauses = [
        clause for clause in all_clauses
        if clause["id"] not in refused_clause_ids
    ]

    contradiction_findings: list[dict] = []
    primary_pair = _select_primary_pair(documents)
    if primary_pair is not None:
        msa_document, sow_document = primary_pair
        msa_clauses = [c for c in eligible_clauses if c["documentId"] == msa_document["id"]]
        sow_clauses = [c for c in eligible_clauses if c["documentId"] == sow_document["id"]]
        contradiction_findings = detect_contradictions(msa_clauses, sow_clauses)

    # ── Step 6: refusal engine — missing documents ───────────────
    # ── Step 7: playbook validation ──────────────────────────────
    playbook_findings = validate_playbook(eligible_clauses, playbook_rules)

    # ── Merge all findings ───────────────────────────────────────
    all_findings = contradiction_findings + refusal_findings + playbook_findings

    # ── Step 8: risk scoring ─────────────────────────────────────
    risk_score = score_risk(all_findings)

    # ── Step 9: redline generation ───────────────────────────────
    all_findings = generate_redlines(all_findings, all_clauses)

    # ── Step 10: report ──────────────────────────────────────────
    report = generate_report(all_clauses, all_findings, risk_score, uploaded_names)

    return {
        "clauses":   all_clauses,
        "findings":  all_findings,
        "riskScore": risk_score,
        "report":    report,
    }
