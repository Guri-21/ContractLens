import type { ClauseDTO, RiskFindingDTO } from './types';
import { getIndianLawExposure } from './analysisInsights';

export type LegalAdviceCitation = {
  label: string;
  quote: string;
};

export type LegalAdviceAnswer = {
  answer: string;
  citations: LegalAdviceCitation[];
  refused: boolean;
};

type LegalIntent =
  | 'highest'
  | 'all_conflicts'
  | 'payment'
  | 'liability'
  | 'sla'
  | 'governing_law'
  | 'indian_laws'
  | 'missing'
  | 'redline'
  | 'generic';

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'for', 'from', 'how',
  'i', 'in', 'is', 'it', 'me', 'of', 'on', 'or', 'our', 'should', 'the', 'this',
  'to', 'what', 'when', 'where', 'which', 'why', 'will', 'with', 'show', 'give',
]);

const RISK_SEVERITY: Record<RiskFindingDTO['riskLevel'], number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export function answerLegalQuestion(
  question: string,
  clauses: ClauseDTO[],
  risks: RiskFindingDTO[],
): LegalAdviceAnswer {
  if (isGreeting(question)) {
    return {
      answer: 'Hi. Ask me about a clause, risk, payment term, liability cap, missing exhibit, deadline, or Indian-law reference from this analysis. I will answer only from the current contract evidence and cite the source when legal content is involved.',
      citations: [],
      refused: false,
    };
  }

  const intent = detectIntent(question);
  const matchedRisks = selectRisksForIntent(intent, question, risks);

  if (matchedRisks.length > 0) {
    return answerFromRisks(intent, matchedRisks);
  }

  const matchedClauses = selectClausesForIntent(intent, question, clauses);
  if (matchedClauses.length > 0) {
    return answerFromClauses(matchedClauses);
  }

  return refusal('I cannot answer this from the current uploaded contract analysis. Upload the referenced document or ask about text that appears in the analyzed clauses.');
}

function detectIntent(question: string): LegalIntent {
  const text = question.toLowerCase();
  if (/\b(redline|suggestion|suggest|fallback|wording|rewrite)\b/.test(text)) return 'redline';
  if (/\b(highest|top|major|main|biggest|critical)\b/.test(text)) return 'highest';
  if (/\b(indian laws?|laws? (?:are )?(?:breached|exposed)|breached laws?|exposed laws?)\b/.test(text)) return 'indian_laws';
  if (/\b(conflict|contradict|override|msa|sow)\b/.test(text) && detectMentionedRiskCategories(question).length > 1) return 'all_conflicts';
  if (/\b(payment|invoice|fee|fees|payable|paid)\b/.test(text)) return 'payment';
  if (/\b(liability|uncapped|cap|damages|indemnif)\b/.test(text)) return 'liability';
  if (/\b(sla|service level|service credit|penalt|uptime|milestone)\b/.test(text)) return 'sla';
  if (/\b(governing law|jurisdiction|forum|arbitration|indian law|india law|law reference|courts?|dispute)\b/.test(text)) return 'governing_law';
  if (/\b(missing|exhibit|not evaluated|refus)\b/.test(text)) return 'missing';
  if (/\b(conflict|contradict|override|msa|sow)\b/.test(text)) return 'all_conflicts';
  return 'generic';
}

function selectRisksForIntent(intent: LegalIntent, question: string, risks: RiskFindingDTO[]): RiskFindingDTO[] {
  const sorted = [...risks].sort(compareRiskSeverity);
  if (intent === 'highest') {
    return sorted.slice(0, 3);
  }
  if (intent === 'all_conflicts') {
    const categories = detectMentionedRiskCategories(question);
    return sorted
      .filter(risk => isConflictRisk(risk) || categories.some(category => riskMatchesIntent(risk, category)))
      .slice(0, 6);
  }
  if (intent === 'missing') {
    return sorted.filter(risk => risk.status === 'not_evaluated' || Boolean(risk.missingDocuments?.length));
  }
  if (intent === 'indian_laws') {
    return getIndianLawExposure(sorted).risks;
  }
  if (intent === 'redline') {
    const targeted = sorted.filter(risk => risk.redline && riskMatchesQuestion(risk, question));
    return targeted.length ? targeted.slice(0, 1) : sorted.filter(risk => risk.redline).slice(0, 2);
  }

  const targeted = sorted.filter(risk => riskMatchesIntent(risk, intent));
  if (targeted.length > 0) return targeted.slice(0, intent === 'generic' ? 3 : 2);

  const terms = tokenize(question);
  return sorted
    .map(risk => ({ risk, score: scoreText(riskSearchText(risk), terms) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || compareRiskSeverity(a.risk, b.risk))
    .map(item => item.risk)
    .slice(0, 3);
}

function answerFromRisks(intent: LegalIntent, matchedRisks: RiskFindingDTO[]): LegalAdviceAnswer {
  const citations = uniqueCitations(matchedRisks.flatMap(riskToCitations));
  const lawRefs = uniqueStrings(
    matchedRisks.flatMap(risk => extractLawReferences(`${risk.reason} ${risk.playbookRuleViolated || ''} ${riskToCitations(risk).map(c => `${c.label} ${c.quote}`).join(' ')}`)),
  );
  const lawExposure = intent === 'indian_laws' ? getIndianLawExposure(matchedRisks) : null;

  const answerParts: string[] = [];

  if (lawExposure && lawExposure.laws.length > 0) {
    answerParts.push(`Likely Indian laws breached or exposed: ${lawExposure.laws.map(law => `${law.name} (${law.source === 'exact' ? 'named in source' : 'inferred from risk type'})`).join('; ')}.`);
  }

  if (intent === 'all_conflicts' || matchedRisks.length > 1) {
    answerParts.push(`I found ${matchedRisks.length} relevant finding${matchedRisks.length === 1 ? '' : 's'} in this analysis:`);
    matchedRisks.forEach((risk, index) => {
      answerParts.push(`${index + 1}. ${riskLabel(risk)}: ${risk.reason}`);
      if (risk.redline && intent === 'redline') {
        answerParts.push(`   Suggested wording: ${risk.redline.suggestedText}`);
      }
    });
  } else {
    const risk = matchedRisks[0];
    answerParts.push(`The main concern is: ${risk.reason}`);
    if (risk.missingDocuments?.length) {
      answerParts.push(`Missing source: ${risk.missingDocuments.join(', ')}.`);
    }
    if (risk.redline && intent === 'redline') {
      answerParts.push(`Suggested wording: ${risk.redline.suggestedText}`);
    }
  }

  if (lawRefs.length > 0) {
    answerParts.push(`Legal reference found in the analyzed sources: ${lawRefs.join(', ')}.`);
  }

  if (citations.length === 0) {
    return refusal('This finding exists, but it has no exact source quote attached. I will not give legal advice without evidence.');
  }

  answerParts.push('I am only using the cited contract/risk evidence below; this is review assistance, not external legal advice.');

  return {
    answer: answerParts.join('\n\n'),
    citations,
    refused: false,
  };
}

function answerFromClauses(clauses: ClauseDTO[]): LegalAdviceAnswer {
  const citations = uniqueCitations(clauses.slice(0, 4).map(clause => ({
    label: clauseLabel(clause),
    quote: clause.text,
  })));

  return {
    answer: `The relevant analyzed clause says: ${trimSentence(clauses[0].text)}\n\nI am only using the cited contract text below; this is review assistance, not external legal advice.`,
    citations,
    refused: false,
  };
}

function selectClausesForIntent(intent: LegalIntent, question: string, clauses: ClauseDTO[]): ClauseDTO[] {
  const targeted = clauses.filter(clause => clauseMatchesIntent(clause, intent));
  if (targeted.length > 0) return targeted.slice(0, 4);

  const terms = tokenize(question);
  return clauses
    .map(clause => ({ clause, score: scoreText(clauseSearchText(clause), terms) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.clause)
    .slice(0, 4);
}

function riskMatchesIntent(risk: RiskFindingDTO, intent: LegalIntent): boolean {
  const text = riskSearchText(risk);
  if (intent === 'payment') return /\b(payment|invoice|fee|fees|payable|paid)\b/.test(text);
  if (intent === 'liability') return /\b(liability|uncapped|cap|damages|indemnif)\b/.test(text);
  if (intent === 'sla') return /\b(sla|service level|service credit|penalt|uptime|milestone)\b/.test(text);
  if (intent === 'governing_law') return /\b(governing law|jurisdiction|forum|arbitration|indian law|india law|courts?|dispute|delaware|singapore|london|california|dubai)\b/.test(text);
  return false;
}

function detectMentionedRiskCategories(question: string): LegalIntent[] {
  const text = question.toLowerCase();
  const categories: LegalIntent[] = [];
  if (/\b(payment|invoice|fee|fees|payable|paid)\b/.test(text)) categories.push('payment');
  if (/\b(liability|uncapped|cap|damages|indemnif)\b/.test(text)) categories.push('liability');
  if (/\b(sla|service level|service credit|penalt|uptime|milestone)\b/.test(text)) categories.push('sla');
  if (/\b(governing law|jurisdiction|forum|arbitration|indian law|india law|courts?|dispute)\b/.test(text)) categories.push('governing_law');
  return categories;
}

function clauseMatchesIntent(clause: ClauseDTO, intent: LegalIntent): boolean {
  const text = clauseSearchText(clause);
  if (intent === 'payment') return /\b(payment|invoice|fee|fees|payable|paid)\b/.test(text);
  if (intent === 'liability') return /\b(liability|uncapped|cap|damages|indemnif)\b/.test(text);
  if (intent === 'sla') return /\b(sla|service level|service credit|penalt|uptime|milestone)\b/.test(text);
  if (intent === 'governing_law') return /\b(governing law|jurisdiction|forum|arbitration|indian law|india law|courts?|dispute)\b/.test(text);
  return false;
}

function riskMatchesQuestion(risk: RiskFindingDTO, question: string): boolean {
  const intent = detectIntent(question.replace(/\b(redline|suggestion|suggest|fallback|wording|rewrite)\b/gi, ''));
  return intent === 'redline' || intent === 'generic' ? true : riskMatchesIntent(risk, intent);
}

function isConflictRisk(risk: RiskFindingDTO): boolean {
  const type = risk.contradictionType || '';
  const text = risk.reason.toLowerCase();
  return type === 'msa_conflict' || type === 'country_law_violation' || text.includes('conflict') || text.includes('override') || text.includes('contradict');
}

function riskToCitations(risk: RiskFindingDTO): LegalAdviceCitation[] {
  return (risk.evidence || [])
    .filter(evidence => evidence.quote?.trim())
    .map(evidence => ({
      label: `${evidence.documentName}${evidence.section ? ` - Section ${evidence.section}` : ''}${evidence.page ? ` - Page ${evidence.page}` : ''}`,
      quote: evidence.quote,
    }));
}

function compareRiskSeverity(a: RiskFindingDTO, b: RiskFindingDTO): number {
  return RISK_SEVERITY[b.riskLevel] - RISK_SEVERITY[a.riskLevel];
}

function riskLabel(risk: RiskFindingDTO): string {
  if (risk.status === 'not_evaluated') return 'Not evaluated';
  return `${risk.riskLevel.toUpperCase()} risk`;
}

function riskSearchText(risk: RiskFindingDTO): string {
  return [
    risk.reason,
    risk.playbookRuleViolated || '',
    risk.contradictionType || '',
    risk.redline?.originalText || '',
    risk.redline?.suggestedText || '',
    ...(risk.evidence || []).flatMap(evidence => [evidence.documentName, evidence.section || '', evidence.quote]),
  ].join(' ').toLowerCase();
}

function clauseSearchText(clause: ClauseDTO): string {
  return [
    clause.documentName,
    clause.sectionNumber || '',
    clause.title || '',
    clause.clauseType || '',
    clause.text,
  ].join(' ').toLowerCase();
}

function clauseLabel(clause: ClauseDTO): string {
  return `${clause.documentName}${clause.sectionNumber ? ` - Section ${clause.sectionNumber}` : ''}${clause.page ? ` - Page ${clause.page}` : ''}`;
}

function scoreText(text: string, terms: string[]): number {
  return terms.reduce((score, term) => score + (text.includes(term) ? term.length : 0), 0);
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

function isGreeting(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return /^(hi|hello|hey|test|testing|ok|okay|thanks|thank you)[.!?\s]*$/.test(normalized);
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

function uniqueStrings(values: string[]): string[] {
  return values.filter((value, index, all) => all.indexOf(value) === index);
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
