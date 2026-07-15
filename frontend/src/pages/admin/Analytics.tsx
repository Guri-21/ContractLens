import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { fetchGlobalAnalytics, GlobalAnalyticsResponse } from '../../api/adminAnalytics';
import { 
  RiskDistributionDonut, 
  ClauseTypeBarChart, 
  RiskTrendLineChart, 
  LegalRiskFingerprint 
} from '../../components/admin/AdvisorRiskCharts';
import { FileText, AlertTriangle, Users, CheckCircle, Clock, Trophy } from 'lucide-react';

export default function Analytics() {
  const [data, setData] = useState<GlobalAnalyticsResponse>({
    summary: {
      totalDocuments: 0,
      analyzedDocuments: 0,
      pendingDocuments: 0,
      totalClauses: 0,
      totalRisks: 0,
      highRiskCount: 0,
      criticalRiskCount: 0,
      notEvaluatedCount: 0,
      averageRiskScore: 0,
    },
    riskDistribution: [],
    clauseTypeRisk: [],
    documentAnalytics: [],
    trend: [],
    leaderboard: [],
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const analytics = await fetchGlobalAnalytics();
        setData(analytics);
      } catch (err) {
        console.error("Failed to load global analytics", err);
      }
    };
    loadData();
  }, []);



  const { summary, leaderboard, documentAnalytics } = data;
  const highRiskDocs = documentAnalytics.filter(d => d.riskScore >= 10).sort((a, b) => b.riskScore - a.riskScore).slice(0, 5);

  return (
    <div className="space-y-6 animate-cl-fade max-w-7xl mx-auto relative pb-12">
      <div>
        <h2 className="text-2xl font-serif font-bold text-text-dark">Global Enterprise Analytics</h2>
        <p className="text-text-light text-sm mt-1">Aggregated risk metrics, trends, and team performance across all documents.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Reviewed" value={summary.totalDocuments} icon={<FileText className="w-5 h-5 text-blue-500" />} />
        <StatCard title="Avg Risk Score" value={summary.averageRiskScore} icon={<AlertTriangle className="w-5 h-5 text-amber-500" />} />
        <StatCard title="High/Critical Risks" value={summary.highRiskCount + summary.criticalRiskCount} icon={<AlertTriangle className="w-5 h-5 text-red-500" />} />
        <StatCard title="Pending Docs" value={summary.pendingDocuments} icon={<Clock className="w-5 h-5 text-slate-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Enterprise Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <RiskDistributionDonut data={data.riskDistribution} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk Trend (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <RiskTrendLineChart data={data.trend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aggregate Legal Risk Fingerprint</CardTitle>
          </CardHeader>
          <CardContent>
            <LegalRiskFingerprint data={data.clauseTypeRisk} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Advisor Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="p-3 text-xs font-semibold text-slate-500 uppercase">Advisor</th>
                    <th className="p-3 text-xs font-semibold text-slate-500 uppercase text-center">Docs</th>
                    <th className="p-3 text-xs font-semibold text-slate-500 uppercase text-center">Risks</th>
                    <th className="p-3 text-xs font-semibold text-slate-500 uppercase text-right">High Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((adv, idx) => (
                    <tr key={adv.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="p-3 flex items-center gap-3">
                        <span className={`font-bold w-4 ${idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-amber-700' : 'text-slate-300'}`}>
                          #{idx + 1}
                        </span>
                        <div className="font-medium text-text-dark text-sm truncate max-w-[150px]" title={adv.email}>
                          {adv.email}
                        </div>
                      </td>
                      <td className="p-3 text-center text-sm text-slate-600 font-semibold">{adv.docs}</td>
                      <td className="p-3 text-center text-sm text-slate-600">{adv.risks}</td>
                      <td className="p-3 text-right text-sm text-status-danger font-semibold">{adv.highRisks}</td>
                    </tr>
                  ))}
                  {leaderboard.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-400 text-sm">No activity recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top High Risk Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {highRiskDocs.length === 0 ? (
              <div className="text-sm text-text-light italic">No high risk documents found. Excellent!</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {highRiskDocs.map(doc => (
                  <div key={doc.documentId} className="border border-red-100 bg-red-50/30 rounded-lg p-4 flex flex-col hover:border-red-200 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-text-dark text-sm truncate pr-2" title={doc.documentName}>{doc.documentName}</h4>
                      <span className="bg-red-100 text-red-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex-shrink-0">Score {doc.riskScore}</span>
                    </div>
                    <div className="text-xs text-slate-600 mb-3 flex-1">
                      <span className="font-medium">{doc.totalRisks}</span> total risks identified across <span className="font-medium">{doc.totalClauses}</span> clauses.
                    </div>
                    {doc.topRisks.length > 0 && (
                      <div className="text-[11px] text-slate-500 bg-white p-2 rounded border border-slate-100">
                        <span className="font-semibold text-slate-700 block mb-1">Top Flag:</span>
                        <span className="line-clamp-2">{doc.topRisks[0]}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-start justify-between group hover:border-primary/50 transition-colors">
      <div>
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">{title}</p>
        <p className="text-3xl font-bold text-text-dark">{value}</p>
      </div>
      <div className="p-3 bg-slate-50 rounded-lg group-hover:bg-primary/5 transition-colors">
        {icon}
      </div>
    </div>
  );
}
