import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router';
import { AuthProvider, ProtectedRoute } from './lib/context/AuthContext';
import Home from './pages/Home';
import SignIn from './pages/SignIn';
import AdminLayout from './components/layout/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import MsaRepository from './pages/admin/MsaRepository';
import LegalAdvisors from './pages/admin/LegalAdvisors';
import Analytics from './pages/admin/Analytics';
import AuditLogs from './pages/admin/AuditLogs';
import Settings from './pages/admin/Settings';

import AppShell from './components/AppShell';
import Dashboard from './pages/Dashboard';
import { ReviewerWorkspace } from './reviewer-workspace/ReviewerWorkspace';
import { fetchBackendDocuments } from './api/documents';
import { fetchAllRisks } from './api/analyze';
import { Contract } from './mock/data';

const accents = {
  gold: { color: '#9C7A3C', hover: '#8B6A2D', soft: '#F4F0E8', text: '#5C4A29' },
  crimson: { color: '#8B2635', hover: '#7A1C28', soft: '#F4E8EA', text: '#591621' },
};

function getCurrentNav(pathname: string): string {
  if (pathname.includes('/risk')) return 'risk';
  if (pathname.includes('/clause')) return 'clause';
  if (pathname.includes('/business')) return 'business';
  if (pathname.includes('/dashboard')) return 'dashboard';
  return 'workspace';
}

function ReviewerRoutes() {
  const navigate = useNavigate();
  const location = useLocation();

  const [accentKey, setAccentKey] = useState<'gold' | 'crimson'>('gold');
  const [contractsList, setContractsList] = useState<Contract[]>([]);
  const [globalRisks, setGlobalRisks] = useState<any[]>([]);
  const [riskTab, setRiskTab] = useState<'dept' | 'country' | 'clause'>('dept');
  const [modalType, setModalType] = useState<string | null>(null);

  useEffect(() => {
    const loadBackendData = async () => {
      try {
        const [docsData, analyzeData] = await Promise.all([
          fetchBackendDocuments(),
          fetchAllRisks()
        ]);

        const documentMap: Record<string, any> = {};
        if (Array.isArray(docsData)) {
          docsData.forEach((doc: any) => {
            if (!documentMap[doc.id]) {
              documentMap[doc.id] = {
                id: doc.id,
                name: doc.name || 'Unknown Document',
                type: doc.document_type || 'MSA',
              };
            }
          });
        }

        const backendContracts: Contract[] = Object.values(documentMap).map((doc) => ({
          id: doc.id,
          name: doc.name,
          client: 'Backend Client',
          dept: 'Legal',
          country: 'United States',
          type: doc.type,
          uploadedBy: 'System',
          date: 'Jul 14, 2026',
          iso: '2026-07-14',
          status: 'processing',
          score: null,
          level: null,
          reviewer: 'System',
          rt: 1.0
        }));

        setContractsList(backendContracts);
        setGlobalRisks(Array.isArray(analyzeData) ? analyzeData : []);
      } catch (err) {
        console.warn('Backend server not reachable.', err);
      }
    };
    loadBackendData();
  }, [location.pathname]);

  const activeAccent = accents[accentKey];
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', activeAccent.color);
    document.documentElement.style.setProperty('--accent-hover', activeAccent.hover);
    document.documentElement.style.setProperty('--accent-soft', activeAccent.soft);
    document.documentElement.style.setProperty('--accent-text', activeAccent.text);
  }, [accentKey, activeAccent]);

  const pendingContractsCount = contractsList.filter(c => c.status === 'queued' || c.status === 'processing').length;
  const currentNav = getCurrentNav(location.pathname);

  return (
    <AppShell
      role="reviewer"
      currentNav={currentNav}
      onNavigate={(n) => {
        if (n === 'workspace') navigate('/reviewer/workspace');
        else if (n === 'dashboard') navigate('/reviewer/dashboard');
        else navigate(`/reviewer/${n}`);
      }}
      accentKey={accentKey}
      onChangeAccent={(acc) => setAccentKey(acc as any)}
      onSwitchRole={() => navigate('/')}
      pendingContractsCount={pendingContractsCount}
    >
      <Routes>
        <Route path="workspace" element={<ReviewerWorkspace />} />
        <Route path="dashboard" element={
          <Dashboard
            contracts={contractsList}
            globalRisks={globalRisks}
            riskTab={riskTab}
            onSetRiskTab={setRiskTab as any}
            activeNav={currentNav}
            onOpenExportModal={() => setModalType('export')}
          />
        } />
        <Route path="risk" element={
          <Dashboard
            contracts={contractsList}
            globalRisks={globalRisks}
            riskTab={riskTab}
            onSetRiskTab={setRiskTab as any}
            activeNav={currentNav}
            onOpenExportModal={() => setModalType('export')}
          />
        } />
        <Route path="clause" element={
          <Dashboard
            contracts={contractsList}
            globalRisks={globalRisks}
            riskTab={riskTab}
            onSetRiskTab={setRiskTab as any}
            activeNav={currentNav}
            onOpenExportModal={() => setModalType('export')}
          />
        } />
        <Route path="business" element={
          <Dashboard
            contracts={contractsList}
            globalRisks={globalRisks}
            riskTab={riskTab}
            onSetRiskTab={setRiskTab as any}
            activeNav={currentNav}
            onOpenExportModal={() => setModalType('export')}
          />
        } />
        <Route path="*" element={<Navigate to="workspace" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<SignIn />} />

        <Route 
          path="/admin/*" 
          element={
            <ProtectedRoute requireRole="Admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="msa" element={<MsaRepository />} />
          <Route path="advisors" element={<LegalAdvisors />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="audit" element={<AuditLogs />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route 
          path="/reviewer/*" 
          element={
            <ProtectedRoute requireRole="Legal Reviewer">
              <ReviewerRoutes />
            </ProtectedRoute>
          }
        >
        </Route>
        
        {/* Redirect advisor to reviewer to preserve old bookmarks if any */}
        <Route path="/advisor/*" element={<Navigate to="/reviewer/workspace" replace />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AuthProvider>
  );
}
