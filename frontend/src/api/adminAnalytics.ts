import { API_BASE_URL, authFetch } from './client';
import { cachedRequest, peekCache } from './cache';

export interface AdvisorAnalyticsResponse {
  advisor: {
    id: string;
    email: string;
    role: string;
  };
  summary: {
    totalDocuments: number;
    analyzedDocuments: number;
    pendingDocuments: number;
    totalClauses: number;
    totalRisks: number;
    highRiskCount: number;
    criticalRiskCount: number;
    notEvaluatedCount: number;
    averageRiskScore: number;
  };
  riskDistribution: { level: string; count: number }[];
  clauseTypeRisk: { clauseType: string; low: number; medium: number; high: number; critical: number }[];
  documentAnalytics: {
    documentId: string;
    documentName: string;
    documentType: string;
    status: string;
    totalClauses: number;
    totalRisks: number;
    riskScore: number;
    topRisks: string[];
  }[];
  trend: { date: string; risks: number; high: number; critical: number }[];
  aiInsights: string[];
}

export interface GlobalAnalyticsResponse {
  summary: AdvisorAnalyticsResponse['summary'];
  riskDistribution: AdvisorAnalyticsResponse['riskDistribution'];
  clauseTypeRisk: AdvisorAnalyticsResponse['clauseTypeRisk'];
  documentAnalytics: AdvisorAnalyticsResponse['documentAnalytics'];
  trend: AdvisorAnalyticsResponse['trend'];
  leaderboard: {
    id: string;
    email: string;
    docs: number;
    risks: number;
    highRisks: number;
  }[];
}

export const fetchAdvisorAnalytics = async (
  advisorId: string,
  options: { force?: boolean } = {},
): Promise<AdvisorAnalyticsResponse> => {
  return cachedRequest(`admin-analytics:advisor:${advisorId}`, async () => {
  const res = await authFetch(`${API_BASE_URL}/api/admin/advisors/${advisorId}/analytics`);
  if (!res.ok) throw new Error('Failed to fetch advisor analytics');
  return res.json();
  }, options);
};

export const peekGlobalAnalytics = (): GlobalAnalyticsResponse | undefined =>
  peekCache<GlobalAnalyticsResponse>('admin-analytics:global');

export const fetchGlobalAnalytics = async (options: { force?: boolean } = {}): Promise<GlobalAnalyticsResponse> => {
  return cachedRequest('admin-analytics:global', async () => {
  const res = await authFetch(`${API_BASE_URL}/api/admin/analytics`);
  if (!res.ok) throw new Error('Failed to fetch global analytics');
  return res.json();
  }, options);
};
