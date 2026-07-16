import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { fetchAllRisks } from './api/analyze';
import { BackendDocument, fetchBackendDocuments } from './api/documents';
import AppShell from './components/AppShell';
import AdminLayout from './components/layout/AdminLayout';
import { AuthProvider, ProtectedRoute, useAuth } from './lib/context/AuthContext';
import { levelFor, type Contract } from './mock/data';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import SignIn from './pages/SignIn';
import AdminDashboard from './pages/admin/AdminDashboard';
import Analytics from './pages/admin/Analytics';
import AuditLogs from './pages/admin/AuditLogs';
import LegalAdvisors from './pages/admin/LegalAdvisors';
import MsaRepository from './pages/admin/MsaRepository';
import Settings from './pages/admin/Settings';
import Modal from './components/Modal';
import { ReviewerWorkspace } from './reviewer-workspace/ReviewerWorkspace';
import { SavedAnalysesPage } from './reviewer-workspace/SavedAnalysesPage';
import { calculateAnalysisScores } from './reviewer-workspace/analysisScoring';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<SignIn />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute requireRole="Admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="msa" element={<MsaRepository />} />
          <Route path="advisors" element={<LegalAdvisors />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="audit" element={<AuditLogs />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route
          path="/advisor/*"
          element={
            <ProtectedRoute requireRole="Legal Reviewer">
              <LegalAdvisorPortal />
            </ProtectedRoute>
          }
        />
        <Route path="/reviewer/*" element={<Navigate to="/advisor/workspace" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

function LegalAdvisorPortal() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, email } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [risks, setRisks] = useState<unknown[]>([]);
  const [riskTab, setRiskTab] = useState<'dept' | 'country' | 'clause'>('dept');
  const [modalType, setModalType] = useState<'export' | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPortfolio() {
      let documents: BackendDocument[] = [];
      try {
        documents = await fetchBackendDocuments({ force: true });
        if (!active) return;

        const mappedContracts = Array.isArray(documents)
          ? documents.map(mapDocumentToContract)
          : [];
        setContracts(mappedContracts);
        const documentRisks = Array.isArray(documents) ? flattenDocumentRisks(documents) : [];
        setRisks(documentRisks);
      } catch (error) {
        console.warn('Backend documents not reachable.', error);
      }

      try {
        const findings = await fetchAllRisks();
        if (!active) return;
        const documentRisks = flattenDocumentRisks(documents);
        setRisks(documentRisks.length > 0 ? documentRisks : Array.isArray(findings) ? normalizeStandaloneRisks(findings) : []);
      } catch (error) {
        console.warn('Backend risk findings not reachable; using document risk data only.', error);
      }
    }

    void loadPortfolio();
    return () => {
      active = false;
    };
  }, [location.pathname]);

  const currentNav = getAdvisorNav(location.pathname);
  const pendingContracts = contracts.filter(
    (contract) => contract.status === 'queued' || contract.status === 'processing',
  ).length;
  const dashboard = (
    <Dashboard
      contracts={contracts}
      globalRisks={risks}
      riskTab={riskTab}
      onSetRiskTab={setRiskTab}
      activeNav={currentNav}
      onOpenExportModal={() => setModalType('export')}
    />
  );

  return (
    <>
      <AppShell
        role="reviewer"
        currentNav={currentNav}
        onNavigate={(nav) => navigate(`/advisor/${nav}`)}
        onSwitchRole={logout}
        pendingContractsCount={pendingContracts}
        userEmail={email}
      >
        <Routes>
          <Route index element={<Navigate to="workspace" replace />} />
          <Route path="workspace" element={<ReviewerWorkspace />} />
          <Route path="analyses" element={<SavedAnalysesPage />} />
          <Route path="analyses/:documentId" element={<SavedAnalysesPage />} />
          <Route path="dashboard" element={dashboard} />
          <Route path="risk" element={dashboard} />
          <Route path="clause" element={dashboard} />
          <Route path="business" element={dashboard} />
          <Route path="*" element={<Navigate to="workspace" replace />} />
        </Routes>
      </AppShell>

      <Modal
        modalType={modalType}
        onClose={() => setModalType(null)}
        onSubmit={() => setModalType(null)}
      />
    </>
  );
}

function mapDocumentToContract(document: BackendDocument): Contract {
  const risks = flattenDocumentRisks([document]);
  const score = risks.length > 0
    ? calculateAnalysisScores(risks as any, document.clauses?.length || risks.length).riskScore
    : null;
  const mappedStatus = mapDocumentStatus(document.status, risks.length);
  const analysisDate = inferAnalysisDate(document);

  return {
    id: document.id,
    name: document.name || 'Unknown Document',
    client: inferClientName(document.name),
    dept: inferDepartment(document),
    country: inferCountry(document),
    type: document.document_type || 'MSA',
    uploadedBy: document.uploader?.email || 'Current advisor',
    date: formatDisplayDate(analysisDate),
    iso: analysisDate.toISOString().slice(0, 10),
    status: mappedStatus,
    score,
    level: levelFor(score),
    reviewer: document.assigned_to?.email || 'Unassigned',
    rt: 1,
  };
}

function flattenDocumentRisks(documents: BackendDocument[]) {
  return documents.flatMap((document) =>
    (document.clauses || []).flatMap((clause) =>
      (clause.risks || []).map((risk) => ({
        ...risk,
        riskLevel: risk.riskLevel || risk.risk_level || 'low',
        contradictionType: risk.contradictionType || risk.contradiction_type || undefined,
        clauseType: clause.clauseType || clause.clause_type || 'General',
        clauseId: clause.id,
        documentId: document.id,
        documentName: document.name,
      })),
    ),
  );
}

function normalizeStandaloneRisks(risks: any[]) {
  return risks.map((risk) => ({
    ...risk,
    riskLevel: risk.riskLevel || risk.risk_level || 'low',
    contradictionType: risk.contradictionType || risk.contradiction_type || undefined,
    clauseType: risk.clauseType || risk.clause_type || 'General',
  }));
}

function mapDocumentStatus(status: string, riskCount: number): Contract['status'] {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'failed') return 'failed';
  if (normalized === 'pending' || normalized === 'queued') return 'queued';
  if (normalized === 'processing') return 'processing';
  if (normalized === 'analyzed' || normalized === 'approved' || normalized === 'reviewed') return 'reviewed';
  return riskCount > 0 ? 'reviewed' : 'processing';
}

function inferClientName(name: string): string {
  const clean = name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
  const match = clean.match(/^([A-Za-z0-9]+(?:\s+[A-Za-z0-9]+)?)/);
  return match?.[1] || 'Contract Portfolio';
}

function inferDepartment(document: BackendDocument): string {
  const text = `${document.name || ''} ${document.document_type || ''}`.toLowerCase();
  if (text.includes('health') || text.includes('med') || text.includes('patient')) return 'Healthcare';
  if (text.includes('bank') || text.includes('payment') || text.includes('credit')) return 'Finance';
  if (text.includes('logistics') || text.includes('supply') || text.includes('route')) return 'Operations';
  if (text.includes('energy') || text.includes('meter')) return 'Infrastructure';
  if (document.document_type === 'SOW' || document.document_type === 'ORDER_FORM') return 'Delivery';
  if (document.document_type === 'NDA' || document.document_type === 'DPA') return 'Legal';
  if (document.document_type === 'MSA') return 'Procurement';
  return 'Legal';
}

function inferCountry(document: BackendDocument): string {
  const text = `${document.name || ''} ${(document.clauses || []).map((clause) => clause.id).join(' ')}`.toLowerCase();
  if (text.includes('delaware') || text.includes('acme')) return 'United States';
  if (text.includes('bangalore') || text.includes('india') || text.includes('retailgrid')) return 'India';
  if (text.includes('northstar') || text.includes('logistics')) return 'India';
  if (text.includes('asterbank') || text.includes('bank')) return 'India';
  if (text.includes('medaxis') || text.includes('health')) return 'India';
  if (text.includes('urbangrid') || text.includes('energy')) return 'India';
  return 'India';
}

function inferAnalysisDate(document: BackendDocument): Date {
  if (document.created_at) {
    const parsed = new Date(document.created_at);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const seed = stableHash(document.id || document.name || 'contract');
  const daysBack = seed % 210;
  const date = new Date();
  date.setHours(10, 0, 0, 0);
  date.setDate(date.getDate() - daysBack);
  return date;
}

function stableHash(value: string): number {
  return Array.from(value).reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) >>> 0, 0);
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getAdvisorNav(pathname: string): string {
  if (pathname.includes('/risk')) return 'risk';
  if (pathname.includes('/analyses')) return 'analyses';
  if (pathname.includes('/clause')) return 'clause';
  if (pathname.includes('/business')) return 'business';
  if (pathname.includes('/dashboard')) return 'dashboard';
  return 'workspace';
}
