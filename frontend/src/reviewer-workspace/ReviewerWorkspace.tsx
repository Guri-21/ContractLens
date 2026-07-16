import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, ShieldCheck } from 'lucide-react';
import { UploadFlow } from './components/UploadFlow';
import { ClauseViewer } from './components/ClauseViewer';
import { AiLegalAssistant } from './components/AiLegalAssistant';
import { ResultsDashboard } from './components/ResultsDashboard';
import { ResultsAnalyticsPanel } from './components/ResultsAnalyticsPanel';
import { ApprovalPanel, DocumentStatus } from './components/ApprovalPanel';
import { NotificationCenter } from './components/NotificationCenter';
import { ClauseDTO, RiskFindingDTO } from './types';
import { ReportExport } from '../reports/ReportExport';
import { DependencyGraph } from '../shared-components/DependencyGraph';
import {
  applyReviewerDecisions,
  loadReviewerDecisions,
  saveReviewerDecision,
  type ReviewerDecision,
  type ReviewerDecisionMap,
} from './reviewerDecisions';
import { calculateAnalysisScores } from './analysisScoring';
import { DownloadRedlinedSow } from './components/DownloadRedlinedSow';

type AnalysisTab = 'overview' | 'clauses' | 'risks' | 'graph' | 'redlines' | 'advice' | 'audit';

const TABS: Array<{ id: AnalysisTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'clauses', label: 'Clauses' },
  { id: 'risks', label: 'Risks' },
  { id: 'graph', label: 'Dependency Graph' },
  { id: 'redlines', label: 'Redlines' },
  { id: 'advice', label: 'Legal Advice' },
  { id: 'audit', label: 'Audit & Export' },
];

interface ReviewerWorkspaceProps {
  initialClauses?: ClauseDTO[];
  initialRisks?: RiskFindingDTO[];
  readOnlyAnalysis?: boolean;
}

export const ReviewerWorkspace: React.FC<ReviewerWorkspaceProps> = ({
  initialClauses = [],
  initialRisks = [],
  readOnlyAnalysis = false,
}) => {
  const [isUploaded, setIsUploaded] = useState(readOnlyAnalysis || initialClauses.length > 0);
  const [clauses, setClauses] = useState<ClauseDTO[]>(initialClauses);
  const [risks, setRisks] = useState<RiskFindingDTO[]>(initialRisks);
  const [reviewerDecisions, setReviewerDecisions] = useState<ReviewerDecisionMap>(() => loadReviewerDecisions());
  const [documentStatus, setDocumentStatus] = useState<DocumentStatus>('draft');
  const [activeTab, setActiveTab] = useState<AnalysisTab>('overview');
  const activeRisks = useMemo(
    () => applyReviewerDecisions(risks, reviewerDecisions),
    [reviewerDecisions, risks],
  );
  const recordReviewerDecision = (riskId: string, decision: ReviewerDecision) => {
    setReviewerDecisions(saveReviewerDecision(riskId, decision));
  };

  if (!isUploaded && !readOnlyAnalysis) {
    return (
      <div className="min-h-[calc(100vh-200px)] bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full">
          <UploadFlow onComplete={(data) => {
            setClauses(data.clauses);
            setRisks(data.risks);
            setIsUploaded(true);
            setActiveTab('overview');
          }} />
        </div>
      </div>
    );
  }

  const highRiskCount = activeRisks.filter(r => r.riskLevel === 'critical' || r.riskLevel === 'high').length;
  const notEvaluatedCount = activeRisks.filter(r => r.status === 'not_evaluated').length;
  const cleanClauses = clauses.filter(clause => !activeRisks.some(risk => risk.clauseId === clause.id)).length;
  const { riskScore } = calculateAnalysisScores(activeRisks, clauses.length);

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-legal-surface border-t border-legal-border font-body">
      <div className="flex-1 min-w-0 flex flex-col h-full bg-legal-surface">
        {documentStatus === 'approved' && (
          <div className="bg-redline-addBg border-b border-redline-add p-2 text-center text-xs font-mono text-redline-add font-bold uppercase tracking-wider">
            Document Approved - Edits Disabled
          </div>
        )}

        <header className="flex-shrink-0 border-b border-legal-border bg-legal-bg px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-legal-meta">Analysis Workspace</p>
              <h1 className="mt-1 font-display text-2xl font-semibold text-legal-text">Contract Package Review</h1>
            </div>
            <NotificationCenter />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`border px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-widest transition-colors ${
                  activeTab === tab.id
                    ? 'border-legal-focus bg-legal-focus text-white'
                    : 'border-legal-border bg-legal-surface text-legal-meta hover:border-legal-focus hover:text-legal-text'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden">
          {activeTab === 'overview' && (
            <OverviewTab
              clauses={clauses}
              risks={activeRisks}
              cleanClauses={cleanClauses}
              highRiskCount={highRiskCount}
              notEvaluatedCount={notEvaluatedCount}
            />
          )}
          {activeTab === 'clauses' && (
            <ClauseViewer
              clauses={clauses}
              risks={activeRisks}
              reviewerDecisions={reviewerDecisions}
              onReviewerDecision={recordReviewerDecision}
              isLocked={documentStatus === 'approved'}
            />
          )}
          {activeTab === 'risks' && <RisksTab clauses={clauses} risks={activeRisks} />}
          {activeTab === 'graph' && (
            <div className="flex h-full min-h-0 flex-col p-4 sm:p-6">
              <div className="flex-shrink-0">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-legal-meta">Dependency Map</p>
                  <h2 className="font-display text-2xl font-semibold text-legal-text">Clause Dependency Graph</h2>
                </div>
              </div>
              <div className="mt-4 min-h-0 flex-1 overflow-hidden border border-legal-border bg-white shadow-sm">
                <DependencyGraph clauses={clauses} risks={activeRisks} />
              </div>
            </div>
          )}
          {activeTab === 'redlines' && <RedlinesTab clauses={clauses} risks={activeRisks} reviewerDecisions={reviewerDecisions} />}
          {activeTab === 'advice' && <LegalAdviceTab clauses={clauses} risks={activeRisks} />}
          {activeTab === 'audit' && (
            <div className="h-full overflow-y-auto p-6 cl-scroll">
              <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_320px]">
                <ApprovalPanel status={documentStatus} onUpdateStatus={(newStatus) => setDocumentStatus(newStatus)} />
                <ReportExport findings={activeRisks} score={riskScore} />
                <AuditSummary clauses={clauses} risks={activeRisks} status={documentStatus} />
              </div>
            </div>
          )}
        </main>
      </div>

    </div>
  );
};

function LegalAdviceTab({ clauses, risks }: { clauses: ClauseDTO[]; risks: RiskFindingDTO[] }) {
  return (
    <div className="h-full min-h-0 overflow-hidden p-6">
      <div className="mx-auto grid h-full min-h-0 max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-h-0 overflow-y-auto border border-legal-border bg-white p-5 shadow-sm cl-scroll">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-legal-meta">Grounded Advice Brain</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-legal-text">Legal Advice With Source References</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-legal-meta">
            This section does not guess. It retrieves matching clauses, risk reasons, evidence quotes, and Indian-law references from the current analysis. If the answer is not supported by uploaded documents or extracted evidence, it refuses and asks for the missing source.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <AdviceStat label="Clauses grounded" value={clauses.length} />
            <AdviceStat label="Risk evidence items" value={risks.reduce((total, risk) => total + Math.max(1, risk.evidence?.length || 0), 0)} />
            <AdviceStat label="Open risks" value={risks.length} />
          </div>
          <div className="mt-6 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <strong>Why this helps:</strong> every response must cite exact source text, so reviewers can see why the system said something and can catch missing-data cases instead of trusting hallucinated legal advice.
          </div>
        </section>
        <div className="min-h-0 overflow-hidden">
          <AiLegalAssistant clauses={clauses} risks={risks} />
        </div>
      </div>
    </div>
  );
}

function AdviceStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-legal-border bg-legal-bg p-4">
      <div className="font-display text-3xl font-bold text-legal-text">{value}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-legal-meta">{label}</div>
    </div>
  );
}

function OverviewTab({ clauses, risks, cleanClauses, highRiskCount, notEvaluatedCount }: {
  clauses: ClauseDTO[];
  risks: RiskFindingDTO[];
  cleanClauses: number;
  highRiskCount: number;
  notEvaluatedCount: number;
}) {
  return (
    <div className="h-full overflow-y-auto p-6 cl-scroll">
      <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[1fr_360px]">
        <section className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={FileText} label="Clauses" value={clauses.length} tone="neutral" />
            <MetricCard icon={CheckCircle2} label="No-risk clauses" value={cleanClauses} tone="safe" />
            <MetricCard icon={AlertTriangle} label="High risks" value={highRiskCount} tone="risk" />
            <MetricCard icon={ShieldCheck} label="Not evaluated" value={notEvaluatedCount} tone="warn" />
          </div>
          <ResultsDashboard clauses={clauses} risks={risks} />
        </section>
        <aside className="space-y-6">
          <ResultsAnalyticsPanel clauses={clauses} risks={risks} />
        </aside>
      </div>
    </div>
  );
}

function RisksTab({ clauses, risks }: { clauses: ClauseDTO[]; risks: RiskFindingDTO[] }) {
  const groups = [
    { title: 'MSA vs SOW Contradictions', risks: risks.filter(r => r.contradictionType === 'msa_conflict' || r.reason.toLowerCase().includes('conflict') || r.reason.toLowerCase().includes('contradict')) },
    { title: 'Missing Documents / Refusals', risks: risks.filter(r => r.status === 'not_evaluated') },
    { title: 'Playbook / Legal Grounding', risks: risks.filter(r => r.contradictionType === 'playbook_violation' || r.contradictionType === 'country_law_violation' || r.playbookRuleViolated) },
    { title: 'Other Risks', risks: risks.filter(r => r.status !== 'not_evaluated' && !r.playbookRuleViolated && r.contradictionType !== 'msa_conflict' && r.contradictionType !== 'playbook_violation' && r.contradictionType !== 'country_law_violation') },
  ].filter(group => group.risks.length > 0);

  return (
    <div className="h-full overflow-y-auto p-6 cl-scroll">
      <div className="mx-auto max-w-5xl space-y-6">
        {groups.length === 0 ? (
          <EmptyState title="No risks detected" body="All analyzed clauses are currently clear." />
        ) : groups.map(group => (
          <section key={group.title} className="border border-legal-border bg-white shadow-sm">
            <h2 className="border-b border-legal-border px-5 py-3 font-mono text-xs font-bold uppercase tracking-widest text-legal-text">{group.title}</h2>
            <div className="divide-y divide-legal-border">
              {group.risks.map(risk => {
                const clause = clauses.find(c => c.id === risk.clauseId);
                const isSkipped = risk.status === 'not_evaluated';
                return (
                  <article key={risk.id} className={`p-5 ${isSkipped ? 'bg-amber-50/60' : 'bg-red-50/55'}`}>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={`border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest ${isSkipped ? 'border-amber-300 bg-amber-100 text-amber-800' : 'border-red-200 bg-red-100 text-red-800'}`}>
                        {isSkipped ? 'not evaluated' : `${risk.riskLevel} risk`}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-legal-meta">
                        {clause?.documentName || 'Document'} {clause?.sectionNumber ? `- Section ${clause.sectionNumber}` : ''}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-legal-text">{risk.reason}</p>
                    {risk.evidence?.[0] && (
                      <blockquote className="mt-3 border-l-2 border-legal-focus bg-white/70 px-3 py-2 text-sm italic text-legal-text">
                        "{risk.evidence[0].quote}"
                      </blockquote>
                    )}
                    {risk.missingDocuments?.length ? (
                      <p className="mt-3 font-mono text-[11px] uppercase tracking-widest text-amber-800">Missing: {risk.missingDocuments.join(', ')}</p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function RedlinesTab({ clauses, risks, reviewerDecisions }: { clauses: ClauseDTO[]; risks: RiskFindingDTO[]; reviewerDecisions: ReviewerDecisionMap }) {
  const redlines = risks.filter(risk => risk.redline);
  return (
    <div className="h-full overflow-y-auto p-6 cl-scroll">
      <div className="mx-auto max-w-5xl space-y-4">
        <DownloadRedlinedSow clauses={clauses} risks={risks} reviewerDecisions={reviewerDecisions} />
        {redlines.length === 0 ? (
          <EmptyState title="No redlines required" body="There are no AI drafting suggestions for the current findings." />
        ) : redlines.map(risk => {
          const clause = clauses.find(c => c.id === risk.clauseId);
          return (
            <article key={risk.id} className="border border-legal-border bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-display text-lg font-semibold text-legal-text">{clause?.title || clause?.clauseType || 'Clause redline'}</h3>
                <span className="border border-red-200 bg-red-50 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-red-800">{risk.riskLevel}</span>
              </div>
              <p className="mb-4 text-sm text-legal-text">{risk.reason}</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="border border-red-200 bg-red-50 p-3">
                  <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-red-800">Original</p>
                  <p className="text-sm text-red-900 line-through">{risk.redline?.originalText}</p>
                </div>
                <div className="border border-green-200 bg-green-50 p-3">
                  <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-green-800">Suggested</p>
                  <p className="text-sm text-green-900">{risk.redline?.suggestedText}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function AuditSummary({ clauses, risks, status }: { clauses: ClauseDTO[]; risks: RiskFindingDTO[]; status: DocumentStatus }) {
  return (
    <section className="lg:col-span-2 border border-legal-border bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-mono text-xs font-bold uppercase tracking-widest text-legal-text">Audit Timeline</h2>
      <div className="space-y-3 text-sm text-legal-text">
        <AuditRow label="Documents analyzed" value={`${new Set(clauses.map(c => c.documentId)).size} documents`} />
        <AuditRow label="Clauses extracted" value={`${clauses.length} clauses`} />
        <AuditRow label="Findings generated" value={`${risks.length} findings`} />
        <AuditRow label="Reviewer decision" value={status.replace('_', ' ')} />
      </div>
    </section>
  );
}

function AuditRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-legal-border pb-2 last:border-0">
      <span className="font-mono text-[10px] uppercase tracking-widest text-legal-meta">{label}</span>
      <span className="font-semibold capitalize">{value}</span>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-green-200 bg-green-50 p-6 text-green-800">
      <CheckCircle2 className="mb-3 h-6 w-6" />
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm">{body}</p>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, tone }: { icon: typeof FileText; label: string; value: number; tone: 'neutral' | 'safe' | 'risk' | 'warn' }) {
  const toneClass = {
    neutral: 'border-slate-200 bg-white text-legal-text',
    safe: 'border-green-200 bg-green-50 text-green-800',
    risk: 'border-red-200 bg-red-50 text-red-800',
    warn: 'border-amber-200 bg-amber-50 text-amber-800',
  }[tone];

  return (
    <div className={`border p-4 shadow-sm ${toneClass}`}>
      <Icon className="mb-3 h-5 w-5" />
      <div className="font-display text-3xl font-bold">{value}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-widest">{label}</div>
    </div>
  );
}
