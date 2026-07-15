import type { ClauseDTO, RiskFindingDTO } from '../../reviewer-workspace/types';

export type ClauseVisualStatus = 'safe' | 'risk' | 'not_evaluated';
export type RelationshipType = 'reference' | 'override' | 'conflict' | 'unresolved';

export interface ClauseNodeData {
  clause: ClauseDTO;
  risks: RiskFindingDTO[];
  status: ClauseVisualStatus;
  highestRisk?: RiskFindingDTO['riskLevel'];
  incomingCount: number;
  outgoingCount: number;
  hasOverride: boolean;
  inCycle: boolean;
}

export interface DocumentLane {
  id: string;
  documentId: string;
  documentName: string;
  documentType: ClauseDTO['documentType'];
  clauseCount: number;
  riskCount: number;
  x: number;
  width: number;
}

export interface GraphNode {
  id: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  data: ClauseNodeData;
}

export interface GraphEdgeData {
  relationship: RelationshipType;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  data: GraphEdgeData;
}

export interface GraphModel {
  lanes: DocumentLane[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  cycleNodeIds: string[];
}

export interface GraphFilters {
  documentIds?: readonly string[];
  statuses?: readonly ClauseVisualStatus[];
  relationshipTypes?: readonly RelationshipType[];
}

const DOCUMENT_TYPE_ORDER: Record<ClauseDTO['documentType'], number> = {
  MSA: 0,
  SOW: 1,
  SLA: 2,
  NDA: 3,
  EXHIBIT: 4,
  AMENDMENT: 5,
  ORDER_FORM: 6,
  DPA: 7,
  OTHER: 8,
  PLAYBOOK: 9,
  LAW: 10,
};

const RISK_LEVEL_ORDER: Record<RiskFindingDTO['riskLevel'], number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

const LANE_WIDTH = 320;
const LANE_GAP = 48;
const NODE_X_OFFSET = 24;
const NODE_Y_OFFSET = 32;
export const CLAUSE_NODE_WIDTH = 272;
export const CLAUSE_NODE_HEIGHT = 160;
const NODE_Y_GAP = CLAUSE_NODE_HEIGHT + 24;
const RISK_STATUS_THRESHOLD = RISK_LEVEL_ORDER.medium;
const textCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

interface LaneBucket {
  documentId: string;
  documentName: string;
  documentType: ClauseDTO['documentType'];
  clauses: ClauseDTO[];
}

interface NodeCounts {
  incoming: number;
  outgoing: number;
}

export function buildGraphModel(
  clauses: readonly ClauseDTO[],
  risks: readonly RiskFindingDTO[],
): GraphModel {
  const clauseById = new Map(clauses.map((clause) => [clause.id, clause]));
  const risksByClauseId = groupRisksByClause(risks);
  const laneBuckets = laneBucketsFromClauses(clauses);
  const lanes = buildLanes(laneBuckets, risksByClauseId);
  const edges = buildEdges(clauses, risksByClauseId, clauseById);
  const cycleNodeIds = findCycleNodeIds(edges, clauseById);
  const countsByNodeId = countRelationships(edges, clauseById);
  const nodes = buildNodes(lanes, laneBuckets, risksByClauseId, countsByNodeId, cycleNodeIds);

  return {
    lanes,
    nodes,
    edges,
    cycleNodeIds: [...cycleNodeIds].sort(textCollator.compare),
  };
}

export function filterGraphModel(model: GraphModel, filters: GraphFilters): GraphModel {
  const documentIds = filters.documentIds ? new Set(filters.documentIds) : undefined;
  const statuses = filters.statuses ? new Set(filters.statuses) : undefined;
  const relationshipTypes = filters.relationshipTypes
    ? new Set(filters.relationshipTypes)
    : undefined;
  const nodes = model.nodes.filter((node) => {
    const matchesDocument = !documentIds || documentIds.has(node.data.clause.documentId);
    const matchesStatus = !statuses || statuses.has(node.data.status);
    return matchesDocument && matchesStatus;
  });
  const visibleNodeIds = new Set(nodes.map((node) => node.id));
  const edges = model.edges.filter((edge) => {
    const matchesRelationship = !relationshipTypes || relationshipTypes.has(edge.data.relationship);
    const hasVisibleTarget = visibleNodeIds.has(edge.target) || edge.data.relationship === 'unresolved';
    return matchesRelationship && visibleNodeIds.has(edge.source) && hasVisibleTarget;
  });
  const visibleDocumentIds = new Set(nodes.map((node) => node.data.clause.documentId));
  const lanes = model.lanes
    .filter((lane) => visibleDocumentIds.has(lane.documentId))
    .map((lane) => ({
      ...lane,
      clauseCount: nodes.filter((node) => node.data.clause.documentId === lane.documentId).length,
      riskCount: nodes
        .filter((node) => node.data.clause.documentId === lane.documentId)
        .reduce((count, node) => count + node.data.risks.length, 0),
    }));

  return {
    lanes,
    nodes: [...nodes],
    edges,
    cycleNodeIds: model.cycleNodeIds.filter((nodeId) => visibleNodeIds.has(nodeId)),
  };
}

export function getFocusedElementIds(model: GraphModel, nodeId: string): Set<string> {
  const focusedIds = new Set<string>([nodeId]);

  for (const edge of model.edges) {
    if (edge.source === nodeId || edge.target === nodeId) {
      focusedIds.add(edge.id);
      focusedIds.add(edge.source);
      focusedIds.add(edge.target);
    }
  }

  return focusedIds;
}

function groupRisksByClause(risks: readonly RiskFindingDTO[]): Map<string, RiskFindingDTO[]> {
  const risksByClauseId = new Map<string, RiskFindingDTO[]>();

  for (const risk of risks) {
    const clauseRisks = risksByClauseId.get(risk.clauseId) ?? [];
    risksByClauseId.set(risk.clauseId, [...clauseRisks, risk]);
  }

  return risksByClauseId;
}

function buildLanes(
  laneBuckets: Map<string, LaneBucket>,
  risksByClauseId: Map<string, RiskFindingDTO[]>,
): DocumentLane[] {
  const sortedBuckets = [...laneBuckets.values()].sort(compareLaneBuckets);

  return sortedBuckets.map((bucket, index) => ({
    id: `lane--${bucket.documentId}`,
    documentId: bucket.documentId,
    documentName: bucket.documentName,
    documentType: bucket.documentType,
    clauseCount: bucket.clauses.length,
    riskCount: bucket.clauses.reduce(
      (count, clause) => count + (risksByClauseId.get(clause.id)?.length ?? 0),
      0,
    ),
    x: index * (LANE_WIDTH + LANE_GAP),
    width: LANE_WIDTH,
  }));
}

function buildNodes(
  lanes: readonly DocumentLane[],
  laneBuckets: Map<string, LaneBucket>,
  risksByClauseId: Map<string, RiskFindingDTO[]>,
  countsByNodeId: Map<string, NodeCounts>,
  cycleNodeIds: Set<string>,
): GraphNode[] {
  return lanes.flatMap((lane) => {
    const clauses = laneBuckets.get(lane.documentId)?.clauses ?? [];

    return sortClausesBySection(clauses).map((clause, index) => {
      const clauseRisks = risksByClauseId.get(clause.id) ?? [];
      const counts = countsByNodeId.get(clause.id) ?? { incoming: 0, outgoing: 0 };

      return {
        id: clause.id,
        position: { x: lane.x + NODE_X_OFFSET, y: NODE_Y_OFFSET + index * NODE_Y_GAP },
        width: CLAUSE_NODE_WIDTH,
        height: CLAUSE_NODE_HEIGHT,
        data: {
          clause,
          risks: [...clauseRisks],
          status: getClauseStatus(clauseRisks),
          highestRisk: getHighestRisk(clauseRisks),
          incomingCount: counts.incoming,
          outgoingCount: counts.outgoing,
          hasOverride: clause.overrides.length > 0,
          inCycle: cycleNodeIds.has(clause.id),
        },
      };
    });
  });
}

function laneBucketsFromClauses(clauses: readonly ClauseDTO[]): Map<string, LaneBucket> {
  const laneBuckets = new Map<string, LaneBucket>();

  for (const clause of clauses) {
    const bucket = laneBuckets.get(clause.documentId);
    if (bucket) {
      laneBuckets.set(clause.documentId, {
        ...bucket,
        clauses: [...bucket.clauses, clause],
      });
      continue;
    }

    laneBuckets.set(clause.documentId, {
      documentId: clause.documentId,
      documentName: clause.documentName,
      documentType: clause.documentType,
      clauses: [clause],
    });
  }

  return laneBuckets;
}

function buildEdges(
  clauses: readonly ClauseDTO[],
  risksByClauseId: Map<string, RiskFindingDTO[]>,
  clauseById: Map<string, ClauseDTO>,
): GraphEdge[] {
  const edgesById = new Map<string, GraphEdge>();
  const addEdge = (source: string, target: string, relationship: RelationshipType) => {
    const resolvedRelationship = clauseById.has(target) ? relationship : 'unresolved';
    const id = `${source}--${resolvedRelationship}--${target}`;
    edgesById.set(id, {
      id,
      source,
      target,
      data: { relationship: resolvedRelationship },
    });
  };

  for (const clause of clauses) {
    for (const target of clause.references) {
      addEdge(clause.id, target, 'reference');
    }
    for (const target of clause.overrides) {
      addEdge(clause.id, target, 'override');
    }

    const relatedClauseIds = [...new Set([...clause.overrides, ...clause.references])].filter((target) =>
      clauseById.has(target),
    );
    const hasContradiction = (risksByClauseId.get(clause.id) ?? []).some(
      (risk) => risk.contradictionType !== undefined,
    );
    if (hasContradiction) {
      for (const target of relatedClauseIds) {
        addEdge(clause.id, target, 'conflict');
      }
    }
  }

  return [...edgesById.values()];
}

function findCycleNodeIds(
  edges: readonly GraphEdge[],
  clauseById: Map<string, ClauseDTO>,
): Set<string> {
  const adjacentNodeIds = new Map<string, string[]>();
  for (const edge of edges) {
    if (!clauseById.has(edge.target)) {
      continue;
    }
    const neighbors = adjacentNodeIds.get(edge.source) ?? [];
    adjacentNodeIds.set(edge.source, [...neighbors, edge.target]);
  }

  const stateByNodeId = new Map<string, 'visiting' | 'visited'>();
  const activePath: string[] = [];
  const cycleNodeIds = new Set<string>();
  const visit = (nodeId: string) => {
    stateByNodeId.set(nodeId, 'visiting');
    activePath.push(nodeId);

    for (const neighborId of adjacentNodeIds.get(nodeId) ?? []) {
      const state = stateByNodeId.get(neighborId);
      if (!state) {
        visit(neighborId);
      } else if (state === 'visiting') {
        const cycleStart = activePath.indexOf(neighborId);
        for (const cycleNodeId of activePath.slice(cycleStart)) {
          cycleNodeIds.add(cycleNodeId);
        }
      }
    }

    activePath.pop();
    stateByNodeId.set(nodeId, 'visited');
  };

  for (const nodeId of clauseById.keys()) {
    if (!stateByNodeId.has(nodeId)) {
      visit(nodeId);
    }
  }

  return cycleNodeIds;
}

function countRelationships(
  edges: readonly GraphEdge[],
  clauseById: Map<string, ClauseDTO>,
): Map<string, NodeCounts> {
  const countsByNodeId = new Map<string, NodeCounts>();
  const getCounts = (nodeId: string) => countsByNodeId.get(nodeId) ?? { incoming: 0, outgoing: 0 };

  for (const edge of edges) {
    if (clauseById.has(edge.source)) {
      const sourceCounts = getCounts(edge.source);
      countsByNodeId.set(edge.source, { ...sourceCounts, outgoing: sourceCounts.outgoing + 1 });
    }
    if (clauseById.has(edge.target)) {
      const targetCounts = getCounts(edge.target);
      countsByNodeId.set(edge.target, { ...targetCounts, incoming: targetCounts.incoming + 1 });
    }
  }

  return countsByNodeId;
}

function sortClausesBySection(clauses: readonly ClauseDTO[]): ClauseDTO[] {
  return [...clauses].sort((left, right) => {
    const sectionComparison = compareSections(left.sectionNumber, right.sectionNumber);
    if (sectionComparison !== 0) {
      return sectionComparison;
    }
    return textCollator.compare(left.id, right.id);
  });
}

function compareLaneBuckets(left: LaneBucket, right: LaneBucket): number {
  const typeComparison = DOCUMENT_TYPE_ORDER[left.documentType] - DOCUMENT_TYPE_ORDER[right.documentType];
  if (typeComparison !== 0) {
    return typeComparison;
  }
  const nameComparison = textCollator.compare(left.documentName, right.documentName);
  return nameComparison !== 0 ? nameComparison : textCollator.compare(left.documentId, right.documentId);
}

function compareSections(left?: string, right?: string): number {
  if (!left || !right) {
    return left ? -1 : right ? 1 : 0;
  }

  const leftParts = left.match(/\d+|\D+/g) ?? [left];
  const rightParts = right.match(/\d+|\D+/g) ?? [right];
  for (let index = 0; index < Math.min(leftParts.length, rightParts.length); index += 1) {
    const leftPart = leftParts[index];
    const rightPart = rightParts[index];
    const leftNumber = Number(leftPart);
    const rightNumber = Number(rightPart);
    const bothNumeric = /^\d+$/.test(leftPart) && /^\d+$/.test(rightPart);
    const comparison = bothNumeric ? leftNumber - rightNumber : textCollator.compare(leftPart, rightPart);
    if (comparison !== 0) {
      return comparison;
    }
  }
  return leftParts.length - rightParts.length;
}

function getClauseStatus(risks: readonly RiskFindingDTO[]): ClauseVisualStatus {
  if (risks.some((risk) => risk.status === 'not_evaluated')) {
    return 'not_evaluated';
  }

  const highestRisk = getHighestRisk(risks);
  return highestRisk && RISK_LEVEL_ORDER[highestRisk] >= RISK_STATUS_THRESHOLD ? 'risk' : 'safe';
}

function getHighestRisk(risks: readonly RiskFindingDTO[]): RiskFindingDTO['riskLevel'] | undefined {
  return risks.reduce<RiskFindingDTO['riskLevel'] | undefined>((highestRisk, risk) => {
    if (!highestRisk || RISK_LEVEL_ORDER[risk.riskLevel] > RISK_LEVEL_ORDER[highestRisk]) {
      return risk.riskLevel;
    }
    return highestRisk;
  }, undefined);
}
