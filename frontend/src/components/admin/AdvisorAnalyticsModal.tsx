import React, { useState } from 'react';
import { AdvisorAnalyticsResponse } from '../../api/adminAnalytics';
import { RiskDistributionDonut, ClauseTypeBarChart, RiskTrendLineChart, LegalRiskFingerprint } from './AdvisorRiskCharts';
import { FileText, AlertTriangle, CheckCircle, Clock, Lightbulb } from 'lucide-react';

interface Props {
  analytics: AdvisorAnalyticsResponse;
  onClose: () => void;
}

export default function AdvisorAnalyticsModal({ analytics, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'risk' | 'clause' | 'documents' | 'ai'>('overview');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'risk', label: 'Risk Graph' },
    { id: 'clause', label: 'Clause Research' },
    { id: 'documents', label: 'Documents' },
    { id: 'ai', label: 'AI Insights' },
  ] as const;

  const { summary, documentAnalytics, aiInsights } = analytics;

  return (
    <div className="fixed inset-0 bg-[#0F172A]/60 z-[60] flex items-center justify-center p-6 animate-cl-fade" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-cl-rise" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-slate-50">
          <div>
            <div className="font-mono text-[11px] tracking-widest text-primary uppercase mb-1">Legal Advisor Analytics</div>
            <h2 className="text-2xl font-serif font-bold text-text-dark">{analytics.advisor.email}</h2>
            <p className="text-sm text-text-light">{analytics.advisor.role}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 bg-white rounded-full border border-slate-200 transition-colors">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-slate-100 bg-white flex space-x-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard title="Total Contracts Reviewed" value={summary.totalDocuments} icon={<FileText className="w-5 h-5" />} />
              <StatCard title="Analyzed Contracts" value={summary.analyzedDocuments} icon={<CheckCircle className="w-5 h-5 text-emerald-500" />} />
              <StatCard title="Pending Analyses" value={summary.pendingDocuments} icon={<Clock className="w-5 h-5 text-amber-500" />} />
              <StatCard title="High Risk Documents" value={documentAnalytics.filter(d => d.riskScore >= 10).length} icon={<AlertTriangle className="w-5 h-5 text-red-500" />} />
              <StatCard title="Total High/Critical Risks" value={summary.highRiskCount + summary.criticalRiskCount} icon={<AlertTriangle className="w-5 h-5 text-red-700" />} />
              <StatCard title="Average Risk Score" value={summary.averageRiskScore} icon={<FileText className="w-5 h-5 text-primary" />} />
            </div>
          )}

          {/* RISK GRAPH TAB */}
          {activeTab === 'risk' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                <h3 className="text-sm font-semibold text-text-dark mb-4">Risk Distribution</h3>
                <RiskDistributionDonut data={analytics.riskDistribution} />
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                <h3 className="text-sm font-semibold text-text-dark mb-4">Risk Trend</h3>
                <RiskTrendLineChart data={analytics.trend} />
              </div>
            </div>
          )}

          {/* CLAUSE RESEARCH TAB */}
          {activeTab === 'clause' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                <h3 className="text-sm font-semibold text-text-dark mb-4">Clause Type Risk Breakdown</h3>
                <ClauseTypeBarChart data={analytics.clauseTypeRisk} />
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                <h3 className="text-sm font-semibold text-text-dark mb-4">Legal Risk Fingerprint</h3>
                <LegalRiskFingerprint data={analytics.clauseTypeRisk} />
              </div>
            </div>
          )}

          {/* DOCUMENTS TAB */}
          {activeTab === 'documents' && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Document</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Type</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Clauses</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Risks</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {documentAnalytics.map(doc => (
                    <tr key={doc.documentId} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-text-dark">{doc.documentName}</div>
                        <div className="text-xs text-text-light">{doc.documentId.substring(0, 8)}...</div>
                      </td>
                      <td className="p-4 text-sm text-slate-600">{doc.documentType || 'Unknown'}</td>
                      <td className="p-4">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          doc.status === 'analyzed' ? 'bg-emerald-100 text-emerald-700' :
                          doc.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-200 text-slate-700'
                        }`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-600">{doc.totalClauses}</td>
                      <td className="p-4 text-sm text-slate-600">{doc.totalRisks}</td>
                      <td className="p-4 text-sm font-semibold text-slate-700">{doc.riskScore}</td>
                    </tr>
                  ))}
                  {documentAnalytics.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">No documents found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* AI INSIGHTS TAB */}
          {activeTab === 'ai' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiInsights.map((insight, idx) => (
                <div key={idx} className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 p-5 rounded-xl flex items-start gap-4">
                  <div className="bg-white p-2 rounded-lg shadow-sm border border-primary/10">
                    <Lightbulb className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-primary-dark mb-1">Generated Insight</h4>
                    <p className="text-sm text-slate-700 leading-relaxed">{insight}</p>
                  </div>
                </div>
              ))}
              {aiInsights.length === 0 && (
                <div className="col-span-full p-8 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                  Not enough data to generate insights.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-start justify-between group hover:border-primary/50 transition-colors">
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{title}</p>
        <p className="text-3xl font-bold text-text-dark">{value}</p>
      </div>
      <div className="p-3 bg-slate-50 rounded-lg group-hover:bg-primary/5 transition-colors">
        {icon}
      </div>
    </div>
  );
}
