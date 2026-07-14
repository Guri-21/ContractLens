"""
Intelligence Layer — Enhanced Pipeline.

Wraps Vinayak's `backend/pipeline/run_pipeline.py` and enriches
the output with:
  1. Clause embeddings stored in ChromaDB
  2. Semantic retrieval of similar clauses from past contracts
  3. Knowledge graph with cycle detection
  4. Claude-powered cross-contract insights summary

This is the MAIN ENTRY POINT for the intelligence layer.

Public API:
    analyze_with_intelligence(documents, playbook_rules, country_code)
        → EnhancedAnalysisResult
"""

from __future__ import annotations

import json
import logging
import os
import time
from typing import Any

from .embeddings import embed_clauses
from .knowledge_graph import build_graph
from .retriever import retrieve_similar
from .types import EnhancedAnalysisResult
from .vector_store import get_store

logger = logging.getLogger(__name__)


def analyze_with_intelligence(
    documents: list[dict[str, Any]],
    playbook_rules: list[str] | None = None,
    country_code: str = "IN",
) -> EnhancedAnalysisResult:
    """
    Run the full analysis pipeline with intelligence enrichment.

    This function:
      1. Calls Vinayak's pipeline to get base analysis
      2. Embeds all clauses in ChromaDB
      3. Retrieves similar clauses from past contracts
      4. Builds a clause relationship knowledge graph
      5. Generates a cross-contract insights summary

    Args:
        documents: List of document dicts with {id, name, type, file_path}.
        playbook_rules: Optional list of plain-English playbook rules.
        country_code: Jurisdiction code (default "IN" for India).

    Returns:
        EnhancedAnalysisResult with full pipeline output + intelligence data.
    """
    playbook_rules = playbook_rules or []
    t0 = time.time()

    # ── Step 1: Run Vinayak's base pipeline ──────────────────────
    pipeline_result = _run_base_pipeline(documents, playbook_rules, country_code)

    clauses = pipeline_result.get("clauses", [])
    findings = pipeline_result.get("findings", [])
    doc_names = [d.get("name", "") for d in documents]

    logger.info(
        "Base pipeline complete: %d clauses, %d findings (%.1fs)",
        len(clauses), len(findings), time.time() - t0,
    )

    # ── Step 2: Embed clauses in ChromaDB ────────────────────────
    t1 = time.time()
    embedded = embed_clauses(clauses)
    store = get_store()
    total_embedded = store.add_clauses(embedded)
    logger.info("Embedded %d clauses in ChromaDB (%.1fs)", total_embedded, time.time() - t1)

    # ── Step 3: Retrieve similar clauses from past contracts ─────
    t2 = time.time()
    retrieval_results = retrieve_similar(
        clauses,
        top_k=5,
        min_score=0.3,
        cross_contract_only=True,
    )
    total_similar = sum(len(r.similar_clauses) for r in retrieval_results)
    logger.info(
        "Retrieval complete: %d similar clauses found (%.1fs)",
        total_similar, time.time() - t2,
    )

    # ── Step 4: Build knowledge graph ────────────────────────────
    t3 = time.time()
    clause_graph = build_graph(clauses, findings)
    logger.info(
        "Graph built: %d nodes, %d edges, %d cycles (%.1fs)",
        clause_graph.stats.get("total_nodes", 0),
        clause_graph.stats.get("total_edges", 0),
        clause_graph.stats.get("cycles_detected", 0),
        time.time() - t3,
    )

    # ── Step 5: Cross-contract insights summary ──────────────────
    similar_summary = None
    if retrieval_results:
        similar_summary = _generate_insights_summary(
            clauses, retrieval_results, findings
        )

    # ── Assemble result ──────────────────────────────────────────
    elapsed = time.time() - t0
    logger.info("Full intelligence analysis complete in %.1fs", elapsed)

    return EnhancedAnalysisResult(
        pipeline_result=pipeline_result,
        retrieval_results=retrieval_results,
        clause_graph=clause_graph,
        similar_contracts_summary=similar_summary,
        documents_analyzed=doc_names,
        total_clauses_embedded=total_embedded,
        total_similar_found=total_similar,
    )


# ── Internal helpers ─────────────────────────────────────────────

def _run_base_pipeline(
    documents: list[dict],
    playbook_rules: list[str],
    country_code: str,
) -> dict[str, Any]:
    """
    Call Vinayak's pipeline. If not available (hasn't been merged yet),
    return mock data so the intelligence layer can be developed independently.
    """
    try:
        from pipeline.run_pipeline import run_analysis_pipeline

        return run_analysis_pipeline(
            documents=documents,
            playbook_rules=playbook_rules,
            country_code=country_code,
        )
    except ImportError:
        logger.warning(
            "Vinayak's pipeline not available — using mock data. "
            "This is expected if the vinayak_feature branch hasn't been merged."
        )
        return _mock_pipeline_result(documents)


def _mock_pipeline_result(documents: list[dict]) -> dict[str, Any]:
    """
    Return realistic mock data so the intelligence layer can be
    developed and tested before Vinayak's pipeline is merged.
    """
    import uuid

    clauses = []
    for doc in documents:
        doc_id = doc.get("id", uuid.uuid4().hex[:8])
        doc_name = doc.get("name", "Unknown")
        doc_type = doc.get("type", "MSA")

        mock_clauses = [
            {
                "id": f"c_{uuid.uuid4().hex[:8]}",
                "documentId": doc_id,
                "documentName": doc_name,
                "documentType": doc_type,
                "sectionNumber": "5.1",
                "title": "Payment Terms",
                "text": "Payment shall be made within 45 days of invoice receipt. Late payments shall accrue interest at 1.5% per month.",
                "clauseType": "payment",
                "references": ["Section 8.2", "Exhibit B"],
                "overrides": [],
                "page": 3,
            },
            {
                "id": f"c_{uuid.uuid4().hex[:8]}",
                "documentId": doc_id,
                "documentName": doc_name,
                "documentType": doc_type,
                "sectionNumber": "7.1",
                "title": "Limitation of Liability",
                "text": "Neither party's aggregate liability shall exceed the total fees paid under this Agreement in the preceding 12 months.",
                "clauseType": "liability",
                "references": ["Section 7.2"],
                "overrides": [],
                "page": 5,
            },
            {
                "id": f"c_{uuid.uuid4().hex[:8]}",
                "documentId": doc_id,
                "documentName": doc_name,
                "documentType": doc_type,
                "sectionNumber": "12.1",
                "title": "Governing Law",
                "text": "This Agreement shall be governed by the laws of India. Any disputes shall be resolved through arbitration in Bengaluru.",
                "clauseType": "governing_law",
                "references": [],
                "overrides": ["notwithstanding Section 5.1"],
                "page": 8,
            },
            {
                "id": f"c_{uuid.uuid4().hex[:8]}",
                "documentId": doc_id,
                "documentName": doc_name,
                "documentType": doc_type,
                "sectionNumber": "9.1",
                "title": "Confidentiality",
                "text": "All Confidential Information shall be protected for a period of 5 years from the date of disclosure, subject to Schedule A.",
                "clauseType": "confidentiality",
                "references": ["Schedule A"],
                "overrides": [],
                "page": 6,
            },
        ]
        clauses.extend(mock_clauses)

    findings = [
        {
            "id": f"r_{uuid.uuid4().hex[:8]}",
            "clauseId": clauses[0]["id"] if clauses else "",
            "riskLevel": "high",
            "status": "evaluated",
            "reason": "Payment terms conflict: MSA specifies Net-45 but SOW references Net-30.",
            "playbookRuleViolated": "Payment terms must not exceed 30 days",
            "evidence": [
                {"documentName": "MSA", "page": 3, "section": "5.1", "quote": "Payment within 45 days"},
            ],
            "missingDocuments": None,
            "redline": None,
        },
        {
            "id": f"r_{uuid.uuid4().hex[:8]}",
            "clauseId": clauses[-1]["id"] if clauses else "",
            "riskLevel": "high",
            "status": "not_evaluated",
            "reason": "Cannot evaluate: clause references Schedule A which was not uploaded.",
            "playbookRuleViolated": None,
            "evidence": [],
            "missingDocuments": ["Schedule A"],
            "redline": None,
        },
    ]

    return {
        "clauses": clauses,
        "findings": findings,
        "riskScore": {"overallScore": 42, "breakdown": {"critical": 0, "high": 2, "medium": 0, "low": 0, "not_evaluated": 1}},
        "report": {"executiveSummary": "Mock analysis complete.", "totalClauses": len(clauses), "totalFindings": len(findings)},
    }


def _generate_insights_summary(
    clauses: list[dict],
    retrieval_results: list[Any],
    findings: list[dict],
) -> str | None:
    """
    Use Claude to generate a brief insights summary comparing the
    current contract with similar clauses from past contracts.
    """
    try:
        import anthropic

        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            logger.warning("ANTHROPIC_API_KEY not set — skipping insights summary")
            return None

        client = anthropic.Anthropic(api_key=api_key)

        # Build a compact summary of retrieval results
        retrieval_summary = []
        for r in retrieval_results[:5]:  # cap at 5 for token budget
            for sc in r.similar_clauses[:2]:
                retrieval_summary.append({
                    "current_clause": r.query_text[:100],
                    "similar_from": sc.document_name,
                    "similar_text": sc.text[:100],
                    "similarity": sc.similarity_score,
                })

        if not retrieval_summary:
            return None

        prompt = f"""You are a contract intelligence system. Based on cross-contract analysis:

Current contract has {len(clauses)} clauses and {len(findings)} risk findings.

Similar clauses found in past contracts:
{json.dumps(retrieval_summary, indent=2)}

Write 2-3 sentences highlighting:
1. Any patterns seen across contracts (e.g. "This payment clause is similar to 3 past contracts")
2. Whether the current risks are common or unusual compared to past analyses
Be specific and factual. Do not fabricate data."""

        resp = client.messages.create(
            model=os.getenv("CLAUDE_MODEL", "claude-sonnet-4-20250514"),
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.content[0].text.strip()

    except Exception as e:
        logger.warning("Insights summary generation failed: %s", e)
        return None
