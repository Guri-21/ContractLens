import { describe, expect, it } from 'vitest';

import type { ClauseDTO, RiskFindingDTO } from '../../reviewer-workspace/types';
import {
  buildGraphModel,
  filterGraphModel,
  getFocusedElementIds,
} from './graphModel';

const clauses: ClauseDTO[] = [
  {
    id: 'msa-payment',
    documentId: 'msa-1',
    documentName: 'Master Services Agreement',
    documentType: 'MSA',
    sectionNumber: '2.10',
    text: 'Payment is due in thirty days.',
    references: [],
    overrides: [],
  },
  {
    id: 'msa-invoices',
    documentId: 'msa-1',
    documentName: 'Master Services Agreement',
    documentType: 'MSA',
    sectionNumber: '2.2',
    text: 'Invoices are issued monthly.',
    references: [],
    overrides: [],
  },
  {
    id: 'sow-payment',
    documentId: 'sow-1',
    documentName: 'Implementation Statement of Work',
    documentType: 'SOW',
    sectionNumber: '1.1',
    text: 'Payment is due in fifteen days.',
    references: ['msa-payment', 'missing-exhibit'],
    overrides: ['msa-payment'],
  },
  {
    id: 'sow-exhibit',
    documentId: 'sow-1',
    documentName: 'Implementation Statement of Work',
    documentType: 'SOW',
    sectionNumber: '1.2',
    text: 'Exhibit is pending.',
    references: [],
    overrides: [],
  },
  {
    id: 'cycle-a',
    documentId: 'sow-1',
    documentName: 'Implementation Statement of Work',
    documentType: 'SOW',
    sectionNumber: '3.1',
    text: 'Cycle A.',
    references: ['cycle-b'],
    overrides: [],
  },
  {
    id: 'cycle-b',
    documentId: 'sow-1',
    documentName: 'Implementation Statement of Work',
    documentType: 'SOW',
    sectionNumber: '3.2',
    text: 'Cycle B.',
    references: ['cycle-a'],
    overrides: [],
  },
];

const risks: RiskFindingDTO[] = [
  {
    id: 'safe-payment',
    clauseId: 'msa-payment',
    riskLevel: 'low',
    status: 'evaluated',
    reason: 'The payment term matches the playbook.',
    evidence: [],
  },
  {
    id: 'risk-payment',
    clauseId: 'sow-payment',
    riskLevel: 'high',
    status: 'evaluated',
    reason: 'The SOW conflicts with the MSA.',
    contradictionType: 'msa_conflict',
    evidence: [],
  },
  {
    id: 'missing-exhibit',
    clauseId: 'sow-exhibit',
    riskLevel: 'medium',
    status: 'not_evaluated',
    reason: 'Cannot evaluate without the exhibit.',
    missingDocuments: ['Security Exhibit'],
    evidence: [],
  },
];

describe('document-lane graph model', () => {
  it('builds clause nodes, ordered document lanes, and relationship edges', () => {
    const model = buildGraphModel(clauses, risks);

    expect(model.lanes.map((lane) => lane.documentType)).toEqual(['MSA', 'SOW']);
    expect(model.nodes.find((node) => node.id === 'msa-payment')?.data.status).toBe('safe');
    expect(model.nodes.find((node) => node.id === 'sow-payment')?.data.status).toBe('risk');
    expect(model.nodes.find((node) => node.id === 'sow-exhibit')?.data.status).toBe('not_evaluated');
    expect(model.edges.map((edge) => edge.data?.relationship)).toEqual(
      expect.arrayContaining(['reference', 'override', 'conflict']),
    );
    expect(model.cycleNodeIds).toEqual(expect.arrayContaining(['cycle-a', 'cycle-b']));
  });

  it('orders clauses numerically by section within each document lane', () => {
    const model = buildGraphModel(clauses, risks);

    expect(
      model.nodes
        .filter((node) => node.data.clause.documentId === 'msa-1')
        .map((node) => node.id),
    ).toEqual(['msa-invoices', 'msa-payment']);
  });

  it('keeps a source clause when a reference target is unresolved', () => {
    const model = buildGraphModel(clauses, risks);
    const unresolvedEdge = model.edges.find(
      (edge) => edge.data?.relationship === 'unresolved' && edge.target === 'missing-exhibit',
    );

    expect(unresolvedEdge).toMatchObject({ source: 'sow-payment', target: 'missing-exhibit' });
    expect(model.nodes.find((node) => node.id === 'sow-payment')).toBeDefined();
  });

  it('filters nodes and retains only visible relationships', () => {
    const model = buildGraphModel(clauses, risks);
    const filtered = filterGraphModel(model, {
      documentIds: ['sow-1'],
      statuses: ['risk'],
    });

    expect(filtered.nodes.map((node) => node.id)).toEqual(['sow-payment']);
    expect(filtered.edges).toEqual([]);
    expect(filtered.lanes.map((lane) => lane.documentId)).toEqual(['sow-1']);
  });

  it('returns a focused node, its direct neighbors, and their connecting edges', () => {
    const model = buildGraphModel(clauses, risks);

    expect(getFocusedElementIds(model, 'sow-payment')).toEqual(
      new Set([
        'sow-payment',
        'msa-payment',
        'missing-exhibit',
        'sow-payment--reference--msa-payment',
        'sow-payment--unresolved--missing-exhibit',
        'sow-payment--override--msa-payment',
        'sow-payment--conflict--msa-payment',
      ]),
    );
  });
});
