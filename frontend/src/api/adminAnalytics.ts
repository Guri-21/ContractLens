import { API_BASE_URL } from './client';

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

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const fetchAdvisorAnalytics = async (advisorId: string): Promise<AdvisorAnalyticsResponse> => {
  const res = await fetch(`${API_BASE_URL}/api/admin/advisors/${advisorId}/analytics`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch advisor analytics');
  return res.json();
};

export const fetchGlobalAnalytics = async (): Promise<GlobalAnalyticsResponse> => {
  const res = await fetch(`${API_BASE_URL}/api/admin/analytics`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch global analytics');
  return res.json();
};
