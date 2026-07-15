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

const ACCENTS = {
  gold: { color: '#9C7A3C', hover: '#8B6A2D', soft: '#F4F0E8', text: '#5C4A29' },
  crimson: { color: '#8B2635', hover: '#7A1C28', soft: '#F4E8EA', text: '#591621' },
};

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
  const { logout } = useAuth();
  const [accentKey, setAccentKey] = useState<'gold' | 'crimson'>('gold');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [risks, setRisks] = useState<unknown[]>([]);
  const [riskTab, setRiskTab] = useState<'dept' | 'country' | 'clause'>('dept');
  const [modalType, setModalType] = useState<'export' | null>(null);

  useEffect(() => {
    const accent = ACCENTS[accentKey];
    document.documentElement.style.setProperty('--accent', accent.color);
    document.documentElement.style.setProperty('--accent-hover', accent.hover);
    document.documentElement.style.setProperty('--accent-soft', accent.soft);
    document.documentElement.style.setProperty('--accent-text', accent.text);
  }, [accentKey]);

  useEffect(() => {
    let active = true;

    async function loadPortfolio() {
      let documents: BackendDocument[] = [];
      try {
        documents = await fetchBackendDocuments();
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
        accentKey={accentKey}
        onChangeAccent={setAccentKey}
        onSwitchRole={logout}
        pendingContractsCount={pendingContracts}
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
  const score = calculateRiskScore(risks);
  const mappedStatus = mapDocumentStatus(document.status, risks.length);

  return {
    id: document.id,
    name: document.name || 'Unknown Document',
    client: inferClientName(document.name),
    dept: inferDepartment(document.document_type),
    country: 'India',
    type: document.document_type || 'MSA',
    uploadedBy: document.uploader?.email || 'Current advisor',
    date: formatDisplayDate(new Date()),
    iso: new Date().toISOString().slice(0, 10),
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

function calculateRiskScore(risks: Array<{ riskLevel?: string; status?: string }>): number | null {
  if (risks.length === 0) return null;

  const weights: Record<string, number> = {
    low: 20,
    medium: 45,
    high: 70,
    critical: 90,
  };

  const total = risks.reduce((sum, risk) => {
    if (risk.status === 'not_evaluated') return sum + 55;
    return sum + (weights[risk.riskLevel || 'low'] || 20);
  }, 0);

  return Math.min(100, Math.round(total / risks.length));
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

function inferDepartment(documentType: string): string {
  if (documentType === 'SOW' || documentType === 'ORDER_FORM') return 'Delivery';
  if (documentType === 'NDA' || documentType === 'DPA') return 'Legal';
  if (documentType === 'MSA') return 'Procurement';
  return 'Legal';
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
