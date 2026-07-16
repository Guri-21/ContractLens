import type { ClauseDTO, RiskFindingDTO } from './types';

export type IndianLawExposure = {
  risks: RiskFindingDTO[];
  laws: IndianLawReference[];
  unmappedRiskCount: number;
};

export type IndianLawReference = {
  name: string;
  section?: string;
  count: number;
  source: 'exact' | 'inferred';
  basis?: string;
};

export type FinancialImpactItem = {
  id: string;
  label: string;
  text: string;
  source: 'clause' | 'risk';
};

export function getIndianLawExposure(risks: RiskFindingDTO[]): IndianLawExposure {
  const indianLawRisks = risks.filter(isIndianLawRisk);
  const laws = getEndangeredIndianLaws(indianLawRisks);

  return {
    risks: indianLawRisks,
    laws,
    unmappedRiskCount: Math.max(0, indianLawRisks.length - laws.reduce((total, law) => total + law.count, 0)),
  };
}

export function getFinancialImpactItems(clauses: ClauseDTO[], risks: RiskFindingDTO[]): FinancialImpactItem[] {
  const clauseItems = clauses
    .filter(isFinancialClause)
    .map(clause => ({
      id: `clause-${clause.id}`,
      label: clause.clauseType || clause.title || 'Financial clause',
      text: clause.text,
      source: 'clause' as const,
    }));

  const riskItems = risks
    .filter(isFinancialRisk)
    .map(risk => ({
      id: `risk-${risk.id}`,
      label: risk.riskLevel === 'critical' ? 'Critical financial risk' : `${risk.riskLevel} financial risk`,
      text: risk.reason,
      source: 'risk' as const,
    }));

  const seen = new Set<string>();
  return [...riskItems, ...clauseItems].filter(item => {
    const key = `${item.label}:${item.text}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isFinancialClause(clause: ClauseDTO): boolean {
  const text = [
    clause.clauseType || '',
    clause.title || '',
    clause.text,
  ].join(' ').toLowerCase();

  return /\b(payment|invoice|fee|fees|payable|paid|liability|cap|damages|penalt|service credit|credit|milestone|refund|liquidated|inr|usd|\$)\b/.test(text);
}

function isFinancialRisk(risk: RiskFindingDTO): boolean {
  const text = [
    risk.reason,
    risk.playbookRuleViolated || '',
    risk.contradictionType || '',
    risk.redline?.originalText || '',
    risk.redline?.suggestedText || '',
    ...(risk.evidence || []).flatMap(evidence => [evidence.section || '', evidence.quote]),
  ].join(' ').toLowerCase();

  return /\b(payment|invoice|fee|fees|payable|paid|liability|cap|damages|penalt|service credit|credit|milestone|refund|liquidated|inr|usd|\$)\b/.test(text);
}

function isIndianLawRisk(risk: RiskFindingDTO): boolean {
  const text = [
    risk.reason,
    risk.playbookRuleViolated || '',
    ...(risk.evidence || []).flatMap(evidence => [evidence.documentName, evidence.section || '', evidence.quote]),
  ].join(' ').toLowerCase();

  return (
    risk.contradictionType === 'country_law_violation' ||
    text.includes('india') ||
    text.includes('indian') ||
    text.includes('act,') ||
    text.includes('companies act') ||
    text.includes('contract act') ||
    text.includes('arbitration') ||
    text.includes('dpdp') ||
    text.includes('digital personal data protection')
  );
}

function getEndangeredIndianLaws(risks: RiskFindingDTO[]): IndianLawReference[] {
  const laws = new Map<string, IndianLawReference>();

  risks.forEach((risk) => {
    const references = extractIndianLawReferences(risk);
    references.forEach((reference) => {
      const current = laws.get(reference.name);
      if (current) {
        current.count += 1;
        current.section ||= reference.section;
        if (current.source === 'inferred' && reference.source === 'exact') {
          current.source = 'exact';
          current.basis = reference.basis;
        }
        return;
      }
      laws.set(reference.name, { ...reference, count: 1 });
    });
  });

  return [...laws.values()].sort((a, b) => {
    if (a.source !== b.source) return a.source === 'exact' ? -1 : 1;
    return b.count - a.count || a.name.localeCompare(b.name);
  });
}

function extractIndianLawReferences(risk: RiskFindingDTO): Omit<IndianLawReference, 'count'>[] {
  const source = [
    risk.playbookRuleViolated || '',
    risk.reason,
    ...(risk.evidence || []).flatMap(evidence => [evidence.section || '', evidence.documentName, evidence.quote]),
  ].join(' ');

  const knownActs = [
    'Indian Contract Act, 1872',
    'Companies Act, 2013',
    'Arbitration and Conciliation Act, 1996',
    'Specific Relief Act, 1963',
    'Limitation Act, 1963',
    'Information Technology Act, 2000',
    'Digital Personal Data Protection Act, 2023',
    'DPDP Act, 2023',
    'Commercial Courts Act, 2015',
    'Indian Stamp Act, 1899',
    'Sale of Goods Act, 1930',
    'Competition Act, 2002',
  ];

  const section = source.match(/(?:section|sec\.?|s\.)\s*[\dA-Za-z.-]+(?:\([\w\d]+\))?/i)?.[0];
  const lowered = source.toLowerCase();
  const exact = knownActs
    .filter((act) => lowered.includes(act.toLowerCase()))
    .map((name) => ({ name, section, source: 'exact' as const, basis: 'Named in extracted evidence or risk reason.' }));
  const genericAct = source.match(/([A-Z][A-Za-z ]+ Act,\s*\d{4})/)?.[1];
  if (genericAct && !exact.some(item => item.name === genericAct)) {
    exact.push({ name: genericAct, section, source: 'exact' as const, basis: 'Named in extracted evidence or risk reason.' });
  }

  if (exact.length > 0) return exact;

  return inferIndianLawReferences(risk);
}

function inferIndianLawReferences(risk: RiskFindingDTO): Omit<IndianLawReference, 'count'>[] {
  const text = [
    risk.reason,
    risk.playbookRuleViolated || '',
    risk.contradictionType || '',
    risk.redline?.originalText || '',
    risk.redline?.suggestedText || '',
    ...(risk.evidence || []).flatMap(evidence => [evidence.section || '', evidence.quote]),
  ].join(' ').toLowerCase();
  const inferred: Omit<IndianLawReference, 'count'>[] = [];

  if (/\b(payment|invoice|fee|fees|payable|paid|liability|cap|damages|penalt|liquidated|service credit|breach|contract)\b/.test(text)) {
    inferred.push({
      name: 'Indian Contract Act, 1872',
      source: 'inferred',
      basis: 'Inferred from contract payment, liability, damages, penalty, or breach risk.',
    });
  }
  if (/\b(arbitration|governing law|jurisdiction|forum|court|dispute)\b/.test(text)) {
    inferred.push({
      name: 'Arbitration and Conciliation Act, 1996',
      source: 'inferred',
      basis: 'Inferred from arbitration, governing-law, forum, or dispute-resolution risk.',
    });
  }
  if (/\b(data|personal data|privacy|dpdp|security|cyber|information technology)\b/.test(text)) {
    inferred.push({
      name: 'Digital Personal Data Protection Act, 2023',
      source: 'inferred',
      basis: 'Inferred from data protection, privacy, or security obligation risk.',
    });
  }
  if (isIndianLawRisk(risk) && !inferred.some(item => item.name === 'Indian Contract Act, 1872')) {
    inferred.push({
      name: 'Indian Contract Act, 1872',
      source: 'inferred',
      basis: 'Inferred as baseline Indian contract law for this contract-risk exposure.',
    });
  }

  return inferred;
}
