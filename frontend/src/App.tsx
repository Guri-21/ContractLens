import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import RoleLanding from './components/RoleLanding';
import AppShell from './components/AppShell';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import AuditTrail from './pages/AuditTrail';
import Modal from './components/Modal';
import { ReviewerWorkspace } from './reviewer-workspace/ReviewerWorkspace';
import DocumentViewer from './pages/DocumentViewer';


import { fetchBackendDocuments } from './api/documents';
import { fetchAllRisks } from './api/analyze';
import { fetchUsers, createUser, updateUser } from './api/users';
import { fetchAuditLogs } from './api/audit';

import { 
  User, PlaybookVersion, Contract, AuditEvent,
  playbookVersions, users as mockUsers, contracts as mockContracts,
  ruleSetsData, trendData, deptData, countryData, clauseData, clauseTypeRisk, auditData 
} from './mock/data';

// Hardcoded accents
const accents = {
  gold: { color: '#9C7A3C', hover: '#8B6A2D', soft: '#F4F0E8', text: '#5C4A29' },
  crimson: { color: '#8B2635', hover: '#7A1C28', soft: '#F4E8EA', text: '#591621' },
};

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [role, setRole] = useState<'admin' | 'legal' | null>(null);
  const [accentKey, setAccentKey] = useState<'gold' | 'crimson'>('gold');

  // Interactive datasets in state
  const [playbooks, setPlaybooks] = useState<PlaybookVersion[]>(playbookVersions);
  const [usersList, setUsersList] = useState<User[]>(mockUsers);
  const [auditList, setAuditList] = useState<AuditEvent[]>(auditData);
  const [contractsList, setContractsList] = useState<Contract[]>(mockContracts);

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
    // If user arrived at a specific URL without a role, we could infer it, but for demo:
    if (!role && location.pathname !== '/') {
      if (location.pathname.startsWith('/admin')) setRole('admin');
      else if (location.pathname.startsWith('/legal')) setRole('legal');
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
        }

        // Fetch users from backend
        try {
          const usersData = await fetchUsers();
          if (Array.isArray(usersData) && usersData.length > 0) {
            const mappedUsers = usersData.map((u: any) => ({
              id: u.id,
              name: u.email.split('@')[0],
              email: u.email,
              role: u.role,
              status: 'Active',
              lastActive: 'Connected'
            }));
            setUsersList(mappedUsers);
          }
        } catch (e) {
          console.warn('Failed to load backend users, using mock users.', e);
        }

        // Fetch audit logs from backend
        try {
          const auditLogs = await fetchAuditLogs();
          if (Array.isArray(auditLogs) && auditLogs.length > 0) {
            const mappedAudits = auditLogs.map((log: any) => ({
              id: log.id,
              contract: log.target_type === 'Document' ? (log.target_id || 'Document') : 'System Activity',
              score: 42,
              level: 'medium' as const,
              uploadedAt: new Date(log.timestamp).toLocaleDateString(),
              summary: `${log.action} on ${log.target_type}`,
              timeline: [
                {
                  kind: log.action,
                  color: '#9C7A3C',
                  at: new Date(log.timestamp).toLocaleTimeString(),
                  title: `${log.action} on ${log.target_type}`,
                  note: `Target ID: ${log.target_id || 'N/A'}`,
                  actor: log.user?.email || 'System'
                }
              ]
            }));
            setAuditList(mappedAudits);
          }
        } catch (e) {
          console.warn('Failed to load backend audit logs, using mock audit logs.', e);
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

  const handleModalSubmit = async (data: any) => {
    if (modalType === 'user') {
      try {
        if (data.id) {
          // Editing existing user
          const updated = await updateUser(data.id, {
            id: data.id,
            email: data.email,
            role: data.role
          });
          setUsersList(usersList.map((u) => u.id === data.id ? { 
            ...u, 
            email: updated.email, 
            role: updated.role,
            name: updated.email.split('@')[0]
          } : u));
        } else {
          // Creating new user
          const created = await createUser({
            id: '',
            email: data.email,
            role: data.role,
            password: 'password123'
          });
          setUsersList([...usersList, {
            id: created.id,
            name: created.email.split('@')[0],
            email: created.email,
            role: created.role,
            status: 'Active',
            lastActive: 'Connected'
          }]);
        }
      } catch (err) {
        console.error('Failed to save user in backend:', err);
        // Local fallback if backend fails or is offline
        if (data.id) {
          setUsersList(usersList.map((u) => u.id === data.id ? { ...u, ...data } : u));
        } else {
          setUsersList([...usersList, {
            id: 'u' + (usersList.length + 1),
            name: data.name || data.email.split('@')[0],
            email: data.email,
            role: data.role,
            status: 'Invited',
            lastActive: '—'
          }]);
        }
      }
    } else if (modalType === 'playbook') {
      // Local fallback for version history list
      setPlaybooks([
        {
          id: 'v' + (playbooks.length + 40),
          version: data.version,
          date: data.date,
          by: 'Sofia Marchetti',
          docs: 3,
          status: 'archived'
        },
        ...playbooks
      ]);
    }
    
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
          if (r === 'legal') navigate('/legal');
        }}
        accentColor={activeAccent.color}
      />
    );
  }



  const currentNav = getCurrentNav(location.pathname, role);

  return (
    <>
      <AppShell
        role={role as 'admin' | 'legal'}
        currentNav={currentNav}
         onNavigate={(n) => {
           if (role === 'admin') {
             if (n === 'audit') navigate('/admin/audit');
             else navigate('/admin');
           } else {
             if (n === 'dashboard') navigate('/legal');
             else if (n === 'workspace') navigate('/legal/workspace');
             else navigate(`/legal/${n}`);
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
          
          <Route path="/admin/audit" element={<AuditTrail auditData={auditList} />} />
          
          <Route path="/legal" element={
            <Dashboard
              contracts={contractsList}
              trendData={trendData}
              deptData={deptData}
              countryData={countryData}
              clauseData={clauseData}
              clauseTypeRisk={clauseTypeRisk}
              riskTab={riskTab}
              onSetRiskTab={setRiskTab}
              activeNav={currentNav}
              onOpenExportModal={() => setModalType('export')}
            />
          } />
          
          <Route path="/legal/workspace" element={<ReviewerWorkspace />} />
          <Route path="/legal/risk" element={
            <Dashboard
              contracts={contractsList}
              trendData={trendData}
              deptData={deptData}
              countryData={countryData}
              clauseData={clauseData}
              clauseTypeRisk={clauseTypeRisk}
              riskTab={riskTab}
              onSetRiskTab={setRiskTab}
              activeNav={currentNav}
              onOpenExportModal={() => setModalType('export')}
            />
          } />
          <Route path="/legal/clause" element={
            <Dashboard
              contracts={contractsList}
              trendData={trendData}
              deptData={deptData}
              countryData={countryData}
              clauseData={clauseData}
              clauseTypeRisk={clauseTypeRisk}
              riskTab={riskTab}
              onSetRiskTab={setRiskTab}
              activeNav={currentNav}
              onOpenExportModal={() => setModalType('export')}
            />
          } />
          <Route path="/legal/business" element={
            <Dashboard
              contracts={contractsList}
              trendData={trendData}
              deptData={deptData}
              countryData={countryData}
              clauseData={clauseData}
              clauseTypeRisk={clauseTypeRisk}
              riskTab={riskTab}
              onSetRiskTab={setRiskTab}
              activeNav={currentNav}
              onOpenExportModal={() => setModalType('export')}
            />
          } />
          
          <Route path="/legal/document-viewer" element={<DocumentViewer />} />
          
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

function getCurrentNav(pathname: string, role: 'admin' | 'legal' | null): string {
  if (role === 'legal') {
    if (pathname === '/legal/workspace') return 'workspace';
    if (pathname === '/legal/risk') return 'risk';
    if (pathname === '/legal/clause') return 'clause';
    if (pathname === '/legal/business') return 'business';
    if (pathname === '/legal/document-viewer') return 'document-viewer';
    return 'dashboard';
  }

  if (pathname.includes('/audit')) return 'audit';
  return 'contracts';
}
