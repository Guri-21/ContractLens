import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import RoleLanding from './components/RoleLanding';
import AppShell from './components/AppShell';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import AuditTrail from './pages/AuditTrail';
import Modal from './components/Modal';
import { ReviewerWorkspace } from './reviewer-workspace/ReviewerWorkspace';

import { fetchBackendDocuments } from './api/documents';
import { fetchAllRisks } from './api/analyze';

import { 
  User, PlaybookVersion, Contract, 
  playbookVersions, users as mockUsers,
  ruleSetsData, auditData 
} from './mock/data';

// Hardcoded accents
const accents = {
  gold: { color: '#9C7A3C', hover: '#8B6A2D', soft: '#F4F0E8', text: '#5C4A29' },
  crimson: { color: '#8B2635', hover: '#7A1C28', soft: '#F4E8EA', text: '#591621' },
};

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [role, setRole] = useState<'admin' | 'reviewer' | null>(null);
  const [accentKey, setAccentKey] = useState<'gold' | 'crimson'>('gold');

  // Interactive datasets in state
  const [playbooks, setPlaybooks] = useState<PlaybookVersion[]>(playbookVersions);
  const [usersList] = useState<User[]>(mockUsers);
  const [contractsList, setContractsList] = useState<Contract[]>([]);
  const [globalRisks, setGlobalRisks] = useState<any[]>([]);

  // Filters & sorting for contract monitoring
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Modals state
  const [modalType, setModalType] = useState<'playbook' | 'user' | 'country' | 'export' | null>(null);
  const [modalFormInitial, setModalFormInitial] = useState<any>(null);
  const [riskTab, setRiskTab] = useState<'dept' | 'country' | 'clause'>('dept');

  useEffect(() => {
    if (!role && location.pathname !== '/') {
      if (location.pathname.startsWith('/admin')) setRole('admin');
      else if (location.pathname.startsWith('/reviewer')) setRole('reviewer');
    }
  }, [role, location]);

  useEffect(() => {
    const loadBackendData = async () => {
      try {
        const [docsData, analyzeData] = await Promise.all([
          fetchBackendDocuments(),
          fetchAllRisks() // We need this to return real risks
        ]);

        const documentMap: Record<string, { id: string; name: string; type: string; clauses: any[] }> = {};
        
        if (Array.isArray(docsData)) {
          docsData.forEach((doc: any) => {
            if (!documentMap[doc.id]) {
              documentMap[doc.id] = {
                id: doc.id,
                name: doc.name || 'Unknown Document',
                type: doc.document_type || 'MSA',
                clauses: [] // Real clauses aren't stored in doc anymore in our API, but wait... docsData returns docs.
              };
            }
          });
        }

        const backendContracts: Contract[] = Object.values(documentMap).map((doc) => {
          // Calculate risks for this doc
          // Dummy usage of analyzeData so TS doesn't complain about it being unused if we don't map findings
          if (Array.isArray(analyzeData) && analyzeData.length > 0) {
            // we could map risks, but for now we'll just let status be processing
          }
          
          let level: 'low' | 'medium' | 'high' | 'critical' | null = null;
          let score = null;
          
          return {
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
            score: score,
            level: level,
            reviewer: 'System',
            rt: 1.0
          };
        });

        if (backendContracts.length > 0) {
          setContractsList(backendContracts);
        } else {
          setContractsList([]); // Clear if empty
        }

        if (Array.isArray(analyzeData)) {
          setGlobalRisks(analyzeData);
        } else {
          setGlobalRisks([]);
        }
      } catch (err) {
        console.warn('Backend server not reachable.', err);
      }
    };

    loadBackendData();
  }, [location.pathname]); // Reload data when navigation happens

  const activeAccent = accents[accentKey];

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', activeAccent.color);
    document.documentElement.style.setProperty('--accent-hover', activeAccent.hover);
    document.documentElement.style.setProperty('--accent-soft', activeAccent.soft);
    document.documentElement.style.setProperty('--accent-text', activeAccent.text);
  }, [accentKey, activeAccent]);

  // Modals and sorting handlers...
  const handleSetActivePlaybook = (id: string) => {
    setPlaybooks(playbooks.map((p) => ({ ...p, status: p.id === id ? 'active' : 'archived' })));
  };

  const handleEditUser = (user: User) => {
    setModalFormInitial(user);
    setModalType('user');
  };

  const handleModalSubmit = () => {
    setModalType(null);
    setModalFormInitial(null);
  };

  const handleSetSort = (key: string) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const pendingContractsCount = contractsList.filter(
    (c) => c.status === 'queued' || c.status === 'processing'
  ).length;

  if (!role || location.pathname === '/') {
    return (
      <RoleLanding
        onSelectRole={(r) => {
          setRole(r as any);
          if (r === 'admin') navigate('/admin');
          if (r === 'reviewer') navigate('/reviewer/workspace');
        }}
        accentColor={activeAccent.color}
      />
    );
  }



  const currentNav = getCurrentNav(location.pathname, role);

  return (
    <>
      <AppShell
        role={role as 'admin' | 'reviewer'}
        currentNav={currentNav}
         onNavigate={(n) => {
           if (role === 'admin') {
             if (n === 'audit') navigate('/admin/audit');
             else navigate('/admin');
           } else if (role === 'reviewer') {
             if (n === 'workspace') navigate('/reviewer/workspace');
             else if (n === 'dashboard') navigate('/reviewer/dashboard');
             else navigate(`/reviewer/${n}`);
           }
        }}
        accentKey={accentKey}
        onChangeAccent={(acc) => setAccentKey(acc)}
        onSwitchRole={() => { setRole(null); navigate('/'); }}
        pendingContractsCount={pendingContractsCount}
      >
        <Routes>
          <Route path="/admin" element={
            <Admin
              playbookVersions={playbooks}
              onSetActivePlaybook={handleSetActivePlaybook}
              onOpenPlaybookModal={() => { setModalFormInitial({}); setModalType('playbook'); }}
              ruleSets={ruleSetsData}
              onOpenCountryModal={() => setModalType('country')}
              usersList={usersList}
              onOpenUserModal={() => { setModalFormInitial({}); setModalType('user'); }}
              onEditUser={handleEditUser}
              contracts={contractsList}
              activeNav={currentNav}
              search={search}
              onSearchChange={setSearch}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              sortKey={sortKey}
              sortDir={sortDir}
              onSetSort={handleSetSort}
            />
          } />
          
          <Route path="/admin/audit" element={<AuditTrail auditData={auditData} />} />
          
          <Route path="/reviewer/workspace" element={<ReviewerWorkspace />} />

          <Route path="/reviewer/dashboard" element={
            <Dashboard
              contracts={contractsList}
              globalRisks={globalRisks}
              riskTab={riskTab}
              onSetRiskTab={setRiskTab}
              activeNav={currentNav}
              onOpenExportModal={() => setModalType('export')}
            />
          } />
          
          <Route path="/reviewer/risk" element={
            <Dashboard
              contracts={contractsList}
              globalRisks={globalRisks}
              riskTab={riskTab}
              onSetRiskTab={setRiskTab}
              activeNav={currentNav}
              onOpenExportModal={() => setModalType('export')}
            />
          } />
          <Route path="/reviewer/clause" element={
            <Dashboard
              contracts={contractsList}
              globalRisks={globalRisks}
              riskTab={riskTab}
              onSetRiskTab={setRiskTab}
              activeNav={currentNav}
              onOpenExportModal={() => setModalType('export')}
            />
          } />
          <Route path="/reviewer/business" element={
            <Dashboard
              contracts={contractsList}
              globalRisks={globalRisks}
              riskTab={riskTab}
              onSetRiskTab={setRiskTab}
              activeNav={currentNav}
              onOpenExportModal={() => setModalType('export')}
            />
          } />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AppShell>

      <Modal
        modalType={modalType}
        onClose={() => { setModalType(null); setModalFormInitial(null); }}
        onSubmit={handleModalSubmit}
        initialData={modalFormInitial}
      />
    </>
  );
}

function getCurrentNav(pathname: string, role: 'admin' | 'reviewer' | null): string {
  if (role === 'reviewer') {
    if (pathname.includes('/risk')) return 'risk';
    if (pathname.includes('/clause')) return 'clause';
    if (pathname.includes('/business')) return 'business';
    if (pathname.includes('/dashboard')) return 'dashboard';
    return 'workspace';
  }

  if (pathname.includes('/audit')) return 'audit';
  return 'contracts';
}
