import { renderToStaticMarkup } from 'react-dom/server';
import { ReactFlowProvider } from 'reactflow';
import { describe, expect, it } from 'vitest';

import type { ClauseDTO, RiskFindingDTO } from '../../reviewer-workspace/types';
import { ClauseNode } from './ClauseNode';
import { EvidenceInspector } from './EvidenceInspector';
import { GraphLegend } from './GraphLegend';

const clause: ClauseDTO = {
  id: 'sow-payment',
  documentId: 'sow-1',
  documentName: 'Implementation Statement of Work',
  documentType: 'SOW',
  sectionNumber: '4.2',
  title: 'Payment terms',
  page: 7,
  text: 'Payment is due within fifteen days of invoice receipt.',
  references: ['msa-payment'],
  overrides: ['msa-payment'],
};

const risk: RiskFindingDTO = {
  id: 'payment-conflict',
  clauseId: clause.id,
  riskLevel: 'high',
  status: 'evaluated',
  reason: 'The SOW shortens the payment term defined by the MSA.',
  contradictionType: 'msa_conflict',
  missingDocuments: ['Security Exhibit'],
  evidence: [
    {
      documentName: 'Master Services Agreement',
      page: 12,
      section: '8.1',
      quote: 'Payment is due within thirty days of invoice receipt.',
    },
  ],
};

describe('dependency graph presentation', () => {
  it('renders risk states, clause metadata, evidence, missing documents, and semantic legend labels', () => {
    const markup = renderToStaticMarkup(
      <ReactFlowProvider>
        <ClauseNode
          data={{
            clause,
            risks: [risk],
            status: 'risk',
            highestRisk: 'high',
            incomingCount: 1,
            outgoingCount: 2,
            hasOverride: true,
            inCycle: true,
          }}
          selected={false}
        />
        <ClauseNode
          data={{
            clause: { ...clause, id: 'safe-clause' },
            risks: [],
            status: 'safe',
            incomingCount: 0,
            outgoingCount: 0,
            hasOverride: false,
            inCycle: false,
          }}
          selected={false}
        />
        <ClauseNode
          data={{
            clause: { ...clause, id: 'refusal-clause' },
            risks: [{ ...risk, id: 'unreviewed-risk', status: 'not_evaluated' }],
            status: 'not_evaluated',
            highestRisk: 'high',
            incomingCount: 0,
            outgoingCount: 0,
            hasOverride: false,
            inCycle: false,
          }}
          selected={false}
        />
        <EvidenceInspector
          clause={clause}
          risks={[risk]}
          linkedClauses={[{ ...clause, id: 'msa-payment', documentName: 'Master Services Agreement' }]}
          onClose={() => undefined}
          onSelectClause={() => undefined}
        />
        <GraphLegend />
      </ReactFlowProvider>,
    );

    expect(markup).toContain('Risk');
    expect(markup).toContain('No risk');
    expect(markup).toContain('Not evaluated');
    expect(markup).toContain('border-red-500');
    expect(markup).toContain('border-l-amber-500');
    expect(markup).toContain('ring-violet-500');
    expect(markup).toContain('SOW 4.2');
    expect(markup).toContain('Implementation Statement of Work');
    expect(markup).toContain('Payment is due within thirty days of invoice receipt.');
    expect(markup).toContain('Security Exhibit');
    expect(markup).toContain('REF');
    expect(markup).toContain('OVERRIDES');
    expect(markup).toContain('CONFLICT');
    expect(markup).toContain('CIRCULAR');
  });
});
