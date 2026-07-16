import type { ClauseDTO, RiskFindingDTO } from './types';

export type LegalAdviceCitation = {
  label: string;
  quote: string;
};

export type LegalAdviceAnswer = {
  answer: string;
  citations: LegalAdviceCitation[];
  refused: boolean;
};

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'for', 'from', 'how',
  'i', 'in', 'is', 'it', 'me', 'of', 'on', 'or', 'our', 'should', 'the', 'this',
  'to', 'what', 'when', 'where', 'which', 'why', 'will', 'with',
]);

export function answerLegalQuestion(
  question: string,
  clauses: ClauseDTO[],
  risks: RiskFindingDTO[],
): LegalAdviceAnswer {
  const terms = tokenize(question);
  if (terms.length === 0) {
    return refusal('Ask about a clause, risk, document, deadline, payment, liability, law, or missing exhibit.');
  }

  const evidence = collectEvidence(clauses, risks)
    .map(item => ({ ...item, score: scoreEvidence(item.searchText, terms) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  if (evidence.length === 0) {
    return refusal('I cannot answer this from the current uploaded contract analysis. Upload the referenced document or ask about text that appears in the analyzed clauses.');
  }

  const topRisk = evidence.find(item => item.kind === 'risk');
  const topClause = evidence.find(item => item.kind === 'clause');
  const lawRefs = evidence
    .flatMap(item => extractLawReferences(`${item.label} ${item.quote}`))
    .filter((value, index, all) => all.indexOf(value) === index);

  const answerParts = [
    topRisk
      ? `The main concern is: ${topRisk.summary}`
      : `The relevant clause says: ${trimSentence(topClause?.quote || evidence[0].quote)}`,
  ];

  if (lawRefs.length > 0) {
    answerParts.push(`Indian-law reference detected: ${lawRefs.join(', ')}.`);
  }

  answerParts.push('I am only using the cited contract/risk evidence below; this is review assistance, not external legal advice.');

  return {
    answer: answerParts.join('\n\n'),
    citations: uniqueCitations(evidence.map(item => ({ label: item.label, quote: item.quote }))),
    refused: false,
  };
}

function collectEvidence(clauses: ClauseDTO[], risks: RiskFindingDTO[]) {
  const clausesById = new Map(clauses.map(clause => [clause.id, clause]));
  const clauseEvidence = clauses.map(clause => ({
    kind: 'clause' as const,
    label: `${clause.documentName}${clause.sectionNumber ? ` - Section ${clause.sectionNumber}` : ''}${clause.page ? ` - Page ${clause.page}` : ''}`,
    quote: clause.text,
    summary: clause.title || clause.clauseType || 'Relevant clause',
    searchText: `${clause.documentName} ${clause.sectionNumber || ''} ${clause.title || ''} ${clause.clauseType || ''} ${clause.text}`,
  }));

  const riskEvidence = risks.flatMap(risk => {
    const clause = clausesById.get(risk.clauseId);
    const directEvidence = risk.evidence?.length
      ? risk.evidence.map(evidence => ({
          kind: 'risk' as const,
          label: `${evidence.documentName}${evidence.section ? ` - Section ${evidence.section}` : ''}${evidence.page ? ` - Page ${evidence.page}` : ''}`,
          quote: evidence.quote,
          summary: risk.reason,
          searchText: `${risk.reason} ${risk.playbookRuleViolated || ''} ${risk.contradictionType || ''} ${evidence.documentName} ${evidence.section || ''} ${evidence.quote}`,
        }))
      : [];

    return [
      ...directEvidence,
      {
        kind: 'risk' as const,
        label: `${clause?.documentName || 'Risk finding'}${clause?.sectionNumber ? ` - Section ${clause.sectionNumber}` : ''}`,
        quote: risk.reason,
        summary: risk.reason,
        searchText: `${risk.reason} ${risk.playbookRuleViolated || ''} ${risk.contradictionType || ''} ${clause?.text || ''}`,
      },
    ];
  });

  return [...riskEvidence, ...clauseEvidence];
}

function scoreEvidence(text: string, terms: string[]): number {
  const lowered = text.toLowerCase();
  return terms.reduce((score, term) => score + (lowered.includes(term) ? term.length : 0), 0);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter(term => term.length > 2 && !STOP_WORDS.has(term))
    .slice(0, 12) || [];
}

function trimSentence(text: string): string {
  return text.length > 220 ? `${text.slice(0, 220).trim()}...` : text;
}

function refusal(answer: string): LegalAdviceAnswer {
  return { answer, citations: [], refused: true };
}

function uniqueCitations(citations: LegalAdviceCitation[]): LegalAdviceCitation[] {
  const seen = new Set<string>();
  return citations.filter(citation => {
    const key = `${citation.label}\n${citation.quote}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractLawReferences(text: string): string[] {
  const known = [
    'Indian Contract Act, 1872',
    'Companies Act, 2013',
    'Arbitration and Conciliation Act, 1996',
    'Specific Relief Act, 1963',
    'Limitation Act, 1963',
    'Information Technology Act, 2000',
    'Digital Personal Data Protection Act, 2023',
    'DPDP Act, 2023',
    'Indian Stamp Act, 1899',
  ];
  const lowered = text.toLowerCase();
  return known.filter(law => lowered.includes(law.toLowerCase()));
}
