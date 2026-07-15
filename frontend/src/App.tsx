import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { fetchAllRisks } from './api/analyze';
import { fetchBackendDocuments } from './api/documents';
import AppShell from './components/AppShell';
import AdminLayout from './components/layout/AdminLayout';
import { AuthProvider, ProtectedRoute, useAuth } from './lib/context/AuthContext';
import type { Contract } from './mock/data';
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
      try {
        const [documents, findings] = await Promise.all([
          fetchBackendDocuments(),
          fetchAllRisks(),
        ]);
        if (!active) return;

        const mappedContracts = Array.isArray(documents)
          ? documents.map(mapDocumentToContract)
          : [];
        setContracts(mappedContracts);
        setRisks(Array.isArray(findings) ? findings : []);
      } catch (error) {
        console.warn('Backend server not reachable.', error);
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

function mapDocumentToContract(document: any): Contract {
  return {
    id: document.id,
    name: document.name || 'Unknown Document',
    client: 'Backend Client',
    dept: 'Legal',
    country: 'United States',
    type: document.document_type || 'MSA',
    uploadedBy: document.uploader?.email || 'System',
    date: 'Jul 14, 2026',
    iso: '2026-07-14',
    status: document.status || 'processing',
    score: null,
    level: null,
    reviewer: document.assigned_to?.email || 'Unassigned',
    rt: 1,
  };
}

function getAdvisorNav(pathname: string): string {
  if (pathname.includes('/risk')) return 'risk';
  if (pathname.includes('/clause')) return 'clause';
  if (pathname.includes('/business')) return 'business';
  if (pathname.includes('/dashboard')) return 'dashboard';
  return 'workspace';
}
