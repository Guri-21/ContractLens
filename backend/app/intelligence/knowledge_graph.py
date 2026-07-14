"""
Intelligence Layer — Clause Relationship Knowledge Graph.

Builds a graph of clause relationships (references, overrides, conflicts)
using networkx for in-memory analysis.  Provides cycle detection,
path finding, and JSON export for frontend visualization.

Optional Neo4j integration can be enabled via NEO4J_URI env var.

Public API:
    build_graph(clauses, findings) → ClauseGraph
"""

from __future__ import annotations

import logging
import os
import re
from typing import Any, Optional

from .types import ClauseGraph, GraphEdge, GraphEdgeKind, GraphNode, GraphNodeKind

logger = logging.getLogger(__name__)

# ── Reference pattern matching ───────────────────────────────────
_REF_PATTERNS = [
    re.compile(r"\b(?:Section|Clause)\s+([\d]+(?:\.[\d]+)*)", re.IGNORECASE),
    re.compile(r"\b(Exhibit|Schedule|Annex|Appendix|Attachment)\s+([A-Z0-9]+)\b", re.IGNORECASE),
    re.compile(r"\b(?:Article)\s+([IVXLCDM]+|\d+)", re.IGNORECASE),
]

_OVERRIDE_KEYWORDS = [
    "notwithstanding",
    "subject to",
    "except as provided",
    "in case of conflict",
    "shall prevail",
    "takes precedence",
    "supersedes",
]


def build_graph(
    clauses: list[dict[str, Any]],
    findings: Optional[list[dict[str, Any]]] = None,
) -> ClauseGraph:
    """
    Build a clause relationship graph from parsed clauses and analysis findings.

    Nodes = documents + clauses.
    Edges = references, overrides, conflicts.

    Args:
        clauses: Clause dicts from the pipeline.
        findings: Risk findings from the pipeline (optional — adds conflict edges).

    Returns:
        ClauseGraph with nodes, edges, detected cycles, and stats.
    """
    try:
        import networkx as nx
    except ImportError:
        raise ImportError("networkx is required: pip install networkx")

    G = nx.DiGraph()

    # ── Build clause ID → clause lookup ──────────────────────────
    clause_map: dict[str, dict[str, Any]] = {}
    doc_ids_seen: set[str] = set()

    for clause in clauses:
        cid = clause["id"]
        clause_map[cid] = clause

        # Add document node (once per document)
        doc_id = clause.get("documentId", "")
        if doc_id and doc_id not in doc_ids_seen:
            G.add_node(
                doc_id,
                kind=GraphNodeKind.DOCUMENT.value,
                label=clause.get("documentName", doc_id),
                document_type=clause.get("documentType", ""),
            )
            doc_ids_seen.add(doc_id)

        # Add clause node
        label = clause.get("title") or clause.get("sectionNumber") or cid[:8]
        G.add_node(
            cid,
            kind=GraphNodeKind.CLAUSE.value,
            label=label,
            clause_type=clause.get("clauseType", ""),
            document_id=doc_id,
        )

        # Edge: document → clause (parent_of)
        if doc_id:
            G.add_edge(doc_id, cid, kind=GraphEdgeKind.PARENT_OF.value, label="contains")

    # ── Reference edges ──────────────────────────────────────────
    section_index = _build_section_index(clauses)

    for clause in clauses:
        cid = clause["id"]
        text = clause.get("text", "")

        # Explicit references from parser
        for ref in clause.get("references", []):
            target_id = _resolve_reference(ref, section_index, clause_map)
            if target_id and target_id != cid:
                G.add_edge(cid, target_id, kind=GraphEdgeKind.REFERENCES.value, label=f"ref: {ref}")

        # Detect override language
        text_lower = text.lower()
        for keyword in _OVERRIDE_KEYWORDS:
            if keyword in text_lower:
                # Try to find the target of the override
                for pattern in _REF_PATTERNS:
                    match = pattern.search(text)
                    if match:
                        ref_str = match.group(0)
                        target_id = _resolve_reference(ref_str, section_index, clause_map)
                        if target_id and target_id != cid:
                            G.add_edge(
                                cid, target_id,
                                kind=GraphEdgeKind.OVERRIDES.value,
                                label=f"overrides ({keyword})",
                            )
                break  # one override keyword is enough

    # ── Conflict edges from findings ─────────────────────────────
    if findings:
        for finding in findings:
            if finding.get("status") == "evaluated" and finding.get("riskLevel") in ("high", "critical"):
                clause_id = finding.get("clauseId", "")
                evidence = finding.get("evidence", [])
                if len(evidence) >= 2 and clause_id:
                    # Find the other clause involved in the conflict
                    for ev in evidence[1:]:
                        # Try to find the matching clause by document + section
                        other_id = _find_clause_by_evidence(ev, clause_map)
                        if other_id and other_id != clause_id:
                            G.add_edge(
                                clause_id, other_id,
                                kind=GraphEdgeKind.CONFLICTS_WITH.value,
                                label=finding.get("reason", "conflict")[:60],
                            )

    # ── Detect cycles ────────────────────────────────────────────
    cycles: list[list[str]] = []
    try:
        raw_cycles = list(nx.simple_cycles(G))
        # Filter out trivial cycles (document→clause parent edges)
        for cycle in raw_cycles:
            if len(cycle) >= 2:
                # Only keep cycles that involve clause→clause edges
                clause_only = [n for n in cycle if G.nodes[n].get("kind") == GraphNodeKind.CLAUSE.value]
                if len(clause_only) >= 2:
                    cycles.append(cycle)
    except Exception as e:
        logger.warning("Cycle detection failed: %s", e)

    # ── Convert to output types ──────────────────────────────────
    nodes = [
        GraphNode(
            id=n,
            kind=GraphNodeKind(data.get("kind", GraphNodeKind.CLAUSE.value)),
            label=data.get("label", n[:8]),
            metadata={k: v for k, v in data.items() if k not in ("kind", "label")},
        )
        for n, data in G.nodes(data=True)
    ]

    edges = [
        GraphEdge(
            source_id=u,
            target_id=v,
            kind=GraphEdgeKind(data.get("kind", GraphEdgeKind.REFERENCES.value)),
            label=data.get("label", ""),
        )
        for u, v, data in G.edges(data=True)
    ]

    stats = {
        "total_nodes": G.number_of_nodes(),
        "total_edges": G.number_of_edges(),
        "document_nodes": sum(1 for _, d in G.nodes(data=True) if d.get("kind") == GraphNodeKind.DOCUMENT.value),
        "clause_nodes": sum(1 for _, d in G.nodes(data=True) if d.get("kind") == GraphNodeKind.CLAUSE.value),
        "reference_edges": sum(1 for _, _, d in G.edges(data=True) if d.get("kind") == GraphEdgeKind.REFERENCES.value),
        "override_edges": sum(1 for _, _, d in G.edges(data=True) if d.get("kind") == GraphEdgeKind.OVERRIDES.value),
        "conflict_edges": sum(1 for _, _, d in G.edges(data=True) if d.get("kind") == GraphEdgeKind.CONFLICTS_WITH.value),
        "cycles_detected": len(cycles),
    }

    logger.info(
        "Graph built: %d nodes, %d edges, %d cycles",
        stats["total_nodes"],
        stats["total_edges"],
        stats["cycles_detected"],
    )

    # ── Optional: sync to Neo4j ──────────────────────────────────
    neo4j_uri = os.getenv("NEO4J_URI")
    if neo4j_uri:
        _sync_to_neo4j(G, neo4j_uri)

    return ClauseGraph(
        nodes=nodes,
        edges=edges,
        cycles=cycles,
        stats=stats,
    )


# ── Internal helpers ─────────────────────────────────────────────

def _build_section_index(clauses: list[dict]) -> dict[str, str]:
    """Map section numbers → clause IDs for reference resolution."""
    index: dict[str, str] = {}
    for c in clauses:
        sn = c.get("sectionNumber")
        if sn:
            index[sn.strip().lower()] = c["id"]
    return index


def _resolve_reference(
    ref: str,
    section_index: dict[str, str],
    clause_map: dict[str, dict],
) -> Optional[str]:
    """Try to resolve a reference string to a clause ID."""
    ref_clean = ref.strip().lower()

    # Direct section number match
    if ref_clean in section_index:
        return section_index[ref_clean]

    # Try extracting just the number
    for pattern in _REF_PATTERNS:
        m = pattern.search(ref)
        if m:
            num = m.group(1) if len(m.groups()) == 1 else f"{m.group(1)} {m.group(2)}"
            num_lower = num.strip().lower()
            if num_lower in section_index:
                return section_index[num_lower]

    return None


def _find_clause_by_evidence(
    evidence: dict[str, Any],
    clause_map: dict[str, dict],
) -> Optional[str]:
    """Try to find a clause ID matching an evidence dict."""
    doc_name = evidence.get("documentName", "").lower()
    section = evidence.get("section", "").lower()

    for cid, clause in clause_map.items():
        if (
            clause.get("documentName", "").lower() == doc_name
            and clause.get("sectionNumber", "").lower() == section
        ):
            return cid
    return None


def _sync_to_neo4j(G: Any, neo4j_uri: str) -> None:
    """
    Optional: push the graph to Neo4j for persistent storage and
    advanced querying (Cypher).

    Requires NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD env vars.
    """
    try:
        from neo4j import GraphDatabase

        user = os.getenv("NEO4J_USER", "neo4j")
        password = os.getenv("NEO4J_PASSWORD", "password")

        driver = GraphDatabase.driver(neo4j_uri, auth=(user, password))

        with driver.session() as session:
            # Clear existing data for this analysis
            session.run("MATCH (n) DETACH DELETE n")

            # Create nodes
            for node_id, data in G.nodes(data=True):
                kind = data.get("kind", "clause")
                label = data.get("label", node_id[:8])
                session.run(
                    f"CREATE (n:{kind.capitalize()} {{id: $id, label: $label}})",
                    id=node_id,
                    label=label,
                )

            # Create edges
            for u, v, data in G.edges(data=True):
                kind = data.get("kind", "references")
                session.run(
                    f"MATCH (a {{id: $u}}), (b {{id: $v}}) "
                    f"CREATE (a)-[:{kind.upper()} {{label: $label}}]->(b)",
                    u=u,
                    v=v,
                    label=data.get("label", ""),
                )

        driver.close()
        logger.info("Graph synced to Neo4j at %s", neo4j_uri)

    except Exception as e:
        logger.warning("Neo4j sync failed (non-fatal): %s", e)
