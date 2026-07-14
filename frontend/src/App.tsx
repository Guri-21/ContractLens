import { useState, useEffect } from 'react';
import RoleLanding from './components/RoleLanding';
import AppShell from './components/AppShell';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import AuditTrail from './pages/AuditTrail';
import Modal from './components/Modal';
import { ReviewerWorkspace } from './reviewer-workspace/ReviewerWorkspace';
import { fetchBackendDocuments } from './api/documents';
import { fetchBackendAnalyze } from './api/analyze';
import {
  accents,
  playbookVersions as initialPlaybookVersions,
  users as initialUsers,
  contracts as initialContracts,
  ruleSetsData,
  clauseData,
  trendData,
  deptData,
  countryData,
  clauseTypeRisk,
  auditData,
  User,
  PlaybookVersion,
  Contract
} from './mock/data';

export default function App() {
  const [role, setRole] = useState<'admin' | 'compliance' | 'reviewer' | null>(null);
  const [nav, setNav] = useState<string>('contracts');
  const [accentKey, setAccentKey] = useState<'gold' | 'crimson'>('gold');

  // Interactive datasets in state
  const [playbooks, setPlaybooks] = useState<PlaybookVersion[]>(initialPlaybookVersions);
  const [usersList, setUsersList] = useState<User[]>(initialUsers);
  const [contractsList, setContractsList] = useState<Contract[]>(initialContracts);

  // Filters & sorting for contract monitoring
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Modals state
  const [modalType, setModalType] = useState<'playbook' | 'user' | 'country' | 'export' | null>(null);
  const [modalFormInitial, setModalFormInitial] = useState<any>(null);
  const [riskTab, setRiskTab] = useState<'dept' | 'country' | 'clause'>('dept');

  // Load backend documents & analysis findings on mount
  useEffect(() => {
    const loadBackendData = async () => {
      try {
        const [docsData, analyzeData] = await Promise.all([
          fetchBackendDocuments(),
          fetchBackendAnalyze()
        ]);

        // Group clauses by documentId to construct contracts list
        const documentMap: Record<string, { id: string; name: string; type: string; clauses: any[] }> = {};
        
        if (Array.isArray(docsData)) {
          docsData.forEach((clause: any) => {
            if (!documentMap[clause.documentId]) {
              documentMap[clause.documentId] = {
                id: clause.documentId,
                name: clause.documentName || 'Unknown Document',
                type: clause.documentType || 'MSA',
                clauses: []
              };
            }
            documentMap[clause.documentId].clauses.push(clause);
          });
        }

        const backendContracts: Contract[] = Object.values(documentMap).map((doc) => {
          const docClausesIds = doc.clauses.map((c) => c.id);
          const findings = Array.isArray(analyzeData) 
            ? analyzeData.filter((r: any) => docClausesIds.includes(r.clauseId)) 
            : [];
          
          let level: 'low' | 'medium' | 'high' | 'critical' | null = null;
          let score = null;
          if (findings.length > 0) {
            level = findings[0].riskLevel as any;
            score = level === 'critical' ? 88 : level === 'high' ? 68 : level === 'medium' ? 48 : 28;
          }

          return {
            id: doc.id,
            name: doc.name,
            client: 'Backend Client',
            dept: 'Legal',
            country: 'United States',
            type: doc.type,
            uploadedBy: 'Backend API',
            date: 'Jul 14, 2026',
            iso: '2026-07-14',
            status: findings.length > 0 && findings[0].status === 'evaluated' ? 'reviewed' : 'processing',
            score: score,
            level: level,
            reviewer: 'System',
            rt: 1.0
          };
        });

        if (backendContracts.length > 0) {
          setContractsList((prevContracts) => {
            const existingIds = prevContracts.map(c => c.id);
            const uniqueNew = backendContracts.filter(bc => !existingIds.includes(bc.id));
            return [...prevContracts, ...uniqueNew];
          });
        }
      } catch (err) {
        console.warn('Backend server not reachable or failed to load. Using mock data.', err);
      }
    };

    loadBackendData();
  }, []);

  // Automatically update navigation default tab when role changes
  useEffect(() => {
    if (role === 'admin') {
      setNav('contracts');
    } else if (role === 'compliance') {
      setNav('dashboard');
    }
  }, [role]);

  const activeAccent = accents[accentKey];

  // Set CSS Variables dynamically on the document root for Tailwind custom themes
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', activeAccent.color);
    document.documentElement.style.setProperty('--accent-hover', activeAccent.hover);
    document.documentElement.style.setProperty('--accent-soft', activeAccent.soft);
    document.documentElement.style.setProperty('--accent-text', activeAccent.text);
  }, [accentKey, activeAccent]);

  // Set active playbook
  const handleSetActivePlaybook = (id: string) => {
    setPlaybooks(
      playbooks.map((p) => ({
        ...p,
        status: p.id === id ? 'active' : 'archived'
      }))
    );
  };

  // Edit user
  const handleEditUser = (user: User) => {
    setModalFormInitial(user);
    setModalType('user');
  };

  // Modal confirm submit actions
  const handleModalSubmit = (formData: any) => {
    if (modalType === 'playbook') {
      const newPlaybook: PlaybookVersion = {
        id: `v${Date.now()}`,
        version: formData.version || 'v4.3',
        date: formData.date || 'Jul 14, 2026',
        by: 'You',
        docs: 3,
        status: 'archived'
      };
      setPlaybooks([newPlaybook, ...playbooks]);
    } else if (modalType === 'user') {
      if (formData.id) {
        // Edit User
        setUsersList(
          usersList.map((u) =>
            u.id === formData.id
              ? { ...u, name: formData.name, email: formData.email, role: formData.role }
              : u
          )
        );
      } else {
        // Add User
        const newUser: User = {
          id: `u${Date.now()}`,
          name: formData.name,
          email: formData.email || 'new.user@contractlens.io',
          role: formData.role,
          status: 'Invited',
          lastActive: '—'
        };
        setUsersList([...usersList, newUser]);
      }
    }
    setModalType(null);
    setModalFormInitial(null);
  };

  // Toggle Sorting column keys
  const handleSetSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const pendingContractsCount = contractsList.filter(
    (c) => c.status === 'queued' || c.status === 'processing'
  ).length;

  // Handle Reviewer Workspace layout
  if (role === 'reviewer') {
    return (
      <div className="relative">
        <button
          onClick={() => setRole(null)}
          className="absolute top-4 left-4 bg-slate-900/80 hover:bg-slate-950 text-white text-xs font-semibold px-3 py-1.5 rounded shadow-md z-[100] transition-colors"
        >
          ← Switch Workspace
        </button>
        <ReviewerWorkspace />
      </div>
    );
  }

  return (
    <>
      {role === null ? (
        <RoleLanding
          onSelectRole={(r) => setRole(r as any)}
          accentColor={activeAccent.color}
        />
      ) : (
        <AppShell
          role={role as 'admin' | 'compliance'}
          currentNav={nav}
          onNavigate={(n) => setNav(n)}
          accentKey={accentKey}
          onChangeAccent={(acc) => setAccentKey(acc)}
          onSwitchRole={() => setRole(null)}
          pendingContractsCount={pendingContractsCount}
        >
          {/* COMPLIANCE PAGES */}
          {role === 'compliance' && (
            <Dashboard
              contracts={contractsList}
              trendData={trendData}
              deptData={deptData}
              countryData={countryData}
              clauseData={clauseData}
              clauseTypeRisk={clauseTypeRisk}
              riskTab={riskTab}
              onSetRiskTab={setRiskTab}
              activeNav={nav}
              onOpenExportModal={() => setModalType('export')}
            />
          )}

          {/* ADMIN PAGES */}
          {role === 'admin' && nav !== 'audit' && (
            <Admin
              playbookVersions={playbooks}
              onSetActivePlaybook={handleSetActivePlaybook}
              onOpenPlaybookModal={() => {
                setModalFormInitial({ version: 'v4.3', date: 'Jul 14, 2026' });
                setModalType('playbook');
              }}
              ruleSets={ruleSetsData}
              onOpenCountryModal={() => setModalType('country')}
              usersList={usersList}
              onOpenUserModal={() => {
                setModalFormInitial({ name: '', email: '', role: 'Legal Reviewer' });
                setModalType('user');
              }}
              onEditUser={handleEditUser}
              contracts={contractsList}
              activeNav={nav}
              search={search}
              onSearchChange={setSearch}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              sortKey={sortKey}
              sortDir={sortDir}
              onSetSort={handleSetSort}
            />
          )}

          {/* AUDIT TRAIL PAGE */}
          {role === 'admin' && nav === 'audit' && (
            <AuditTrail auditData={auditData} />
          )}
        </AppShell>
      )}

      {/* GLOBAL MODALS */}
      <Modal
        modalType={modalType}
        onClose={() => {
          setModalType(null);
          setModalFormInitial(null);
        }}
        onSubmit={handleModalSubmit}
        initialData={modalFormInitial}
      />
    </>
  );
}
