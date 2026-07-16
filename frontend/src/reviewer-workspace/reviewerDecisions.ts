import type { RiskFindingDTO } from './types';

export type ReviewerDecision = 'accepted' | 'rejected' | 'modified';
export type ReviewerDecisionMap = Record<string, ReviewerDecision>;

const STORAGE_KEY = 'contractlens.reviewerDecisions.v1';

export function decisionLabel(decision?: ReviewerDecision): string {
  if (decision === 'accepted') return 'Suggestion accepted';
  if (decision === 'rejected') return 'Suggestion rejected';
  if (decision === 'modified') return 'Manual modification requested';
  return '';
}

export function applyReviewerDecisions(
  risks: RiskFindingDTO[],
  decisions: ReviewerDecisionMap,
): RiskFindingDTO[] {
  return risks.filter(risk => decisions[risk.id] !== 'accepted');
}

export function loadReviewerDecisions(): ReviewerDecisionMap {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as ReviewerDecisionMap;
  } catch {
    return {};
  }
}

export function saveReviewerDecision(riskId: string, decision: ReviewerDecision): ReviewerDecisionMap {
  const decisions = loadReviewerDecisions();
  const next = { ...decisions, [riskId]: decision };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
