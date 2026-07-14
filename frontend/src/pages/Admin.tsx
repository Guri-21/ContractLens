import {
  PlaybookVersion,
  User,
  Contract,
  RuleSet,
  riskMeta,
  statusMeta,
  roleMeta,
  initials
} from '../mock/data';

interface AdminProps {
  playbookVersions: PlaybookVersion[];
  onSetActivePlaybook: (id: string) => void;
  onOpenPlaybookModal: () => void;
  ruleSets: RuleSet[];
  onOpenCountryModal: () => void;
  usersList: User[];
  onOpenUserModal: () => void;
  onEditUser: (user: User) => void;
  contracts: Contract[];
  activeNav: string;
  // Contract monitoring filters and sorting
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  sortKey: string;
  sortDir: 'asc' | 'desc';
  onSetSort: (key: string) => void;
}

export default function Admin({
  playbookVersions,
  onSetActivePlaybook,
  onOpenPlaybookModal,
  ruleSets,
  onOpenCountryModal,
  usersList,
  onOpenUserModal,
  onEditUser,
  contracts,
  activeNav,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortKey,
  sortDir,
  onSetSort
}: AdminProps) {

  const activePlaybook = playbookVersions.find((p) => p.status === 'active') || playbookVersions[0];

  const pillStyle = (bg: string, color: string) => ({
    background: bg,
    color,
    fontSize: '11px',
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: '14px',
    display: 'inline-block',
    whiteSpace: 'nowrap' as const
  });

  // Filter and sort contracts
  const q = search.toLowerCase();
  const filteredContracts = contracts.filter(
    (c) =>
      (statusFilter === 'all' || c.status === statusFilter) &&
      (!q || (c.name + c.client + c.id).toLowerCase().includes(q))
  );

  const sortedContracts = [...filteredContracts].sort((a, b) => {
    let x = a[sortKey as keyof Contract];
    let y = b[sortKey as keyof Contract];

    if (sortKey === 'score') {
      x = x === null ? -1 : x;
      y = y === null ? -1 : y;
    }
    if (sortKey === 'date') {
      x = a.iso;
      y = b.iso;
    }

    const dir = sortDir === 'asc' ? 1 : -1;
    if (x === null || x === undefined) return 1;
    if (y === null || y === undefined) return -1;

    if (x < y) return -1 * dir;
    if (x > y) return 1 * dir;
    return 0;
  });

  const chips = [
    { k: 'all', label: 'All' },
    { k: 'reviewed', label: 'Reviewed' },
    { k: 'processing', label: 'Processing' },
    { k: 'queued', label: 'Queued' },
    { k: 'failed', label: 'Failed' }
  ];

  const tableCols = [
    { k: 'name', label: 'Contract' },
    { k: 'client', label: 'Client' },
    { k: 'type', label: 'Type' },
    { k: 'uploadedBy', label: 'Uploaded by' },
    { k: 'date', label: 'Uploaded' },
    { k: 'status', label: 'Status' },
    { k: 'score', label: 'Risk' },
    { k: 'reviewer', label: 'Reviewer' }
  ];

  return (
    <div>
      {/* ==================== 1. ADMIN: PLAYBOOK ==================== */}
      {activeNav === 'playbook' && (
        <div className="animate-cl-rise">
          <div className="flex flex-col sm:flex-row justify-between items-end mb-6.5 gap-4">
            <div>
              <div className="font-mono text-[11px] tracking-[0.16em] text-accent-text uppercase mb-2">
                Administration
              </div>
              <h1 className="font-serif font-normal text-[32px] m-0 text-[#0F172A]">
                Playbook Management
              </h1>
              <p className="text-[#64748B] text-sm mt-1.5">
                Version the rule documents the review engine evaluates contracts against.
              </p>
            </div>
            <button
              onClick={onOpenPlaybookModal}
              className="bg-accent hover:bg-accent-hover text-white font-semibold text-xs px-4.5 py-2.5 rounded cursor-pointer transition-colors"
            >
              Upload new version
            </button>
          </div>

          {/* Currently Active Banner */}
          <div className="flex flex-col sm:flex-row gap-[14px] items-stretch bg-white border border-[#E2E8F0] border-l-3 border-accent rounded p-5 px-5.5 mb-5.5">
            <div className="flex-1">
              <div className="font-mono text-[11px] tracking-[0.1em] text-accent-text mb-1.5 uppercase font-medium">
                Currently Active
              </div>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="font-serif text-[26px] text-[#0F172A]">
                  Playbook {activePlaybook.version}
                </span>
                <span className="text-[13px] text-[#64748B]">
                  effective {activePlaybook.date}
                </span>
              </div>
              <div className="text-[13px] text-[#64748B] mt-1">
                {activePlaybook.docs} documents • uploaded by {activePlaybook.by}
              </div>
            </div>
            <div className="flex items-center">
              <span className="bg-[#E9F1EC] text-[#3F6B52] text-xs font-semibold px-3 py-1.5 rounded-full">
                ● Live in production
              </span>
            </div>
          </div>

          {/* Playbook History Table */}
          <div className="bg-white border border-[#E2E8F0] rounded overflow-hidden">
            <div className="p-3.5 px-5 border-b border-[#E2E8F0] font-mono text-[11px] tracking-[0.1em] text-[#64748B] uppercase">
              Version history
            </div>
            {playbookVersions.length === 0 ? (
              <div className="bg-white border-t border-[#E2E8F0] p-10 flex flex-col items-center justify-center text-center">
                <div className="text-4xl mb-3 opacity-50">📚</div>
                <h3 className="text-lg font-medium text-slate-800 mb-1">No playbooks found</h3>
                <p className="text-slate-500 text-sm max-w-sm">
                  Upload a playbook to establish the rules your contracts will be evaluated against.
                </p>
              </div>
            ) : (
              <table className="w-full border-collapse text-[13.5px]">
                <thead>
                  <tr className="text-left text-[#64748B] text-[11px] tracking-[0.08em] uppercase border-b border-[#E2E8F0]">
                    <th className="p-[11px] px-5 font-semibold">Version</th>
                    <th className="p-[11px] px-5 font-semibold">Uploaded</th>
                    <th className="p-[11px] px-5 font-semibold">By</th>
                    <th className="p-[11px] px-5 font-semibold">Documents</th>
                    <th className="p-[11px] px-5 font-semibold">Status</th>
                    <th className="p-[11px] px-5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {playbookVersions.map((p) => {
                    const isActive = p.status === 'active';
                    return (
                      <tr key={p.id} className="border-t border-[#F1F5F9] first:border-t-0">
                        <td className="p-3.5 px-5 font-semibold text-[#0F172A]">
                          Playbook {p.version}
                        </td>
                        <td className="p-3.5 px-5 text-[#475569]">{p.date}</td>
                        <td className="p-3.5 px-5 text-[#475569]">{p.by}</td>
                        <td className="p-3.5 px-5 text-[#475569]">{p.docs} docs</td>
                        <td className="p-3.5 px-5">
                          <span
                            style={
                              isActive
                                ? pillStyle('#E9F1EC', '#3F6B52')
                                : pillStyle('#F1F5F9', '#64748B')
                            }
                          >
                            {isActive ? 'Active' : 'Archived'}
                          </span>
                        </td>
                        <td className="p-3.5 px-5 text-right">
                          {isActive ? (
                            <span className="text-[#94A3B8] text-xs font-semibold px-3 py-1.5 inline-block">
                              In use
                            </span>
                          ) : (
                            <button
                              onClick={() => onSetActivePlaybook(p.id)}
                              className="bg-transparent border border-accent hover:bg-accent-soft text-accent-text text-xs font-semibold px-3 py-1.5 rounded cursor-pointer transition-colors"
                            >
                              Set active
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ==================== 2. ADMIN: COUNTRY RULES ==================== */}
      {activeNav === 'country' && (
        <div className="animate-cl-rise">
          <div className="flex flex-col sm:flex-row justify-between items-end mb-6.5 gap-4">
            <div>
              <div className="font-mono text-[11px] tracking-[0.16em] text-accent-text uppercase mb-2">
                Administration
              </div>
              <h1 className="font-serif font-normal text-[32px] m-0 text-[#0F172A]">
                Country Compliance Rules
              </h1>
              <p className="text-[#64748B] text-sm mt-1.5">
                Manage the jurisdiction rule sets applied during review.
              </p>
            </div>
            <button
              onClick={onOpenCountryModal}
              className="bg-accent hover:bg-accent-hover text-white font-semibold text-xs px-4.5 py-2.5 rounded cursor-pointer transition-colors"
            >
              Replace rule set
            </button>
          </div>

          <div className="flex gap-5 mb-5.5 flex-wrap">
            <div className="flex-[2] min-w-[340px] bg-[#0F172A] text-[#F8FAFC] rounded p-6 px-6.5">
              <div className="font-mono text-[11px] tracking-[0.12em] text-accent mb-2.5 uppercase font-medium">
                Active Jurisdiction
              </div>
              <div className="font-serif text-[28px] mb-1">United States</div>
              <div className="text-sm text-[#94A3B8]">Federal statutes + Delaware state law</div>
              <div className="flex gap-7 mt-5.5">
                <div>
                  <div className="font-serif text-2xl">78</div>
                  <div className="text-[11px] text-[#94A3B8] tracking-[0.06em]">TOTAL RULES</div>
                </div>
                <div>
                  <div className="font-serif text-2xl">5</div>
                  <div className="text-[11px] text-[#94A3B8] tracking-[0.06em]">RULE SETS</div>
                </div>
                <div>
                  <div className="font-serif text-2xl">Jun 18</div>
                  <div className="text-[11px] text-[#94A3B8] tracking-[0.06em]">LAST UPDATED</div>
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-[260px] bg-accent-soft border border-[#E2E8F0] rounded p-5 px-5.5 flex flex-col justify-center">
              <div className="text-xl mb-2">⚖</div>
              <div className="text-[13.5px] leading-relaxed text-accent-text">
                <strong>One active jurisdiction at a time.</strong> Replacing the rule set swaps the entire jurisdiction — the platform does not evaluate multiple jurisdictions concurrently.
              </div>
            </div>
          </div>

          {/* Rule Sets Table */}
          <div className="bg-white border border-[#E2E8F0] rounded overflow-hidden">
            <div className="p-3.5 px-5 border-b border-[#E2E8F0] font-mono text-[11px] tracking-[0.1em] text-[#64748B] uppercase">
              Rule sets • United States
            </div>
            {ruleSets.length === 0 ? (
              <div className="bg-white border-t border-[#E2E8F0] p-10 flex flex-col items-center justify-center text-center">
                <div className="text-4xl mb-3 opacity-50">⚖️</div>
                <h3 className="text-lg font-medium text-slate-800 mb-1">No rule sets found</h3>
                <p className="text-slate-500 text-sm max-w-sm">
                  Add compliance rules to evaluate contracts against jurisdictional regulations.
                </p>
              </div>
            ) : (
              <table className="w-full border-collapse text-[13.5px]">
                <thead>
                  <tr className="text-left text-[#64748B] text-[11px] tracking-[0.08em] uppercase border-b border-[#E2E8F0]">
                    <th className="p-[11px] px-5 font-semibold">Rule set</th>
                    <th className="p-[11px] px-5 font-semibold">Category</th>
                    <th className="p-[11px] px-5 font-semibold">Rules</th>
                    <th className="p-[11px] px-5 font-semibold">Updated</th>
                    <th className="p-[11px] px-5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ruleSets.map((r) => (
                    <tr key={r.name} className="border-t border-[#F1F5F9] first:border-t-0">
                      <td className="p-3.5 px-5 font-semibold text-[#0F172A]">{r.name}</td>
                      <td className="p-3.5 px-5 text-[#475569]">{r.category}</td>
                      <td className="p-3.5 px-5 text-[#475569]">{r.rules}</td>
                      <td className="p-3.5 px-5 text-[#475569]">{r.updated}</td>
                      <td className="p-3.5 px-5">
                        <span className="bg-[#E9F1EC] text-[#3F6B52] text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
                          Enforced
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ==================== 3. ADMIN: USERS ==================== */}
      {activeNav === 'users' && (
        <div className="animate-cl-rise">
          <div className="flex flex-col sm:flex-row justify-between items-end mb-6.5 gap-4">
            <div>
              <div className="font-mono text-[11px] tracking-[0.16em] text-accent-text uppercase mb-2">
                Administration
              </div>
              <h1 className="font-serif font-normal text-[32px] m-0 text-[#0F172A]">
                User &amp; Role Management
              </h1>
              <p className="text-[#64748B] text-sm mt-1.5">
                Each user holds exactly one role. Role determines which workspace they can access.
              </p>
            </div>
            <button
              onClick={onOpenUserModal}
              className="bg-accent hover:bg-accent-hover text-white font-semibold text-xs px-4.5 py-2.5 rounded cursor-pointer transition-colors"
            >
              Add user
            </button>
          </div>

          {/* Users Table */}
          <div className="bg-white border border-[#E2E8F0] rounded overflow-hidden">
            {usersList.length === 0 ? (
              <div className="bg-white border-t border-[#E2E8F0] p-10 flex flex-col items-center justify-center text-center">
                <div className="text-4xl mb-3 opacity-50">👥</div>
                <h3 className="text-lg font-medium text-slate-800 mb-1">No users found</h3>
                <p className="text-slate-500 text-sm max-w-sm">
                  Add team members and assign roles to give them access to the platform.
                </p>
              </div>
            ) : (
              <table className="w-full border-collapse text-[13.5px]">
                <thead>
                  <tr className="text-left text-[#64748B] text-[11px] tracking-[0.08em] uppercase border-b border-[#E2E8F0]">
                    <th className="p-3 px-5 font-semibold">Name</th>
                    <th className="p-3 px-5 font-semibold">Email</th>
                    <th className="p-3 px-5 font-semibold">Role</th>
                    <th className="p-3 px-5 font-semibold">Status</th>
                    <th className="p-3 px-5 font-semibold">Last active</th>
                    <th className="p-3 px-5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => {
                    const rm = roleMeta[u.role] || { soft: '#F1F5F9', color: '#334155' };
                    const stColor =
                      u.status === 'Active'
                        ? '#3F6B52'
                        : u.status === 'Invited'
                        ? '#9C7A3C'
                        : '#94A3B8';
                    return (
                      <tr key={u.id} className="border-t border-[#F1F5F9] first:border-t-0">
                        <td className="p-3 px-5">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-full bg-[#F1F5F9] text-[#334155] flex items-center justify-center font-bold text-[11px] flex-none">
                              {initials(u.name)}
                            </span>
                            <span className="font-semibold text-[#0F172A]">{u.name}</span>
                          </div>
                        </td>
                        <td className="p-3 px-5 text-[#475569] font-mono text-xs truncate max-w-[200px]">
                          {u.email}
                        </td>
                        <td className="p-3 px-5">
                          <span style={pillStyle(rm.soft, rm.color)}>{u.role}</span>
                        </td>
                        <td className="p-3 px-5">
                          <span style={{ color: stColor, fontSize: '12.5px', fontWeight: 600 }}>
                            ● {u.status}
                          </span>
                        </td>
                        <td className="p-3 px-5 text-[#64748B] whitespace-nowrap">{u.lastActive}</td>
                        <td className="p-3 px-5 text-right">
                          <button
                            onClick={() => onEditUser(u)}
                            className="bg-transparent border border-[#E2E8F0] hover:border-accent text-[#334155] hover:text-accent-text text-xs font-semibold px-3 py-1.5 rounded cursor-pointer transition-all"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ==================== 4. ADMIN: CONTRACT MONITORING ==================== */}
      {activeNav === 'contracts' && (
        <div className="animate-cl-rise">
          <div className="mb-5.5">
            <div className="font-mono text-[11px] tracking-[0.16em] text-accent-text uppercase mb-2">
              Administration
            </div>
            <h1 className="font-serif font-normal text-[32px] m-0 text-[#0F172A]">
              System Monitoring — All Contracts
            </h1>
            <p className="text-[#64748B] text-sm mt-1.5">
              Every contract across all reviewers, its processing status, and resulting AI risk score.
            </p>
          </div>

          {/* Search + Filter Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div className="flex gap-2 flex-wrap">
              {chips.map((c) => {
                const active = statusFilter === c.k;
                const cnt =
                  c.k === 'all'
                    ? contracts.length
                    : contracts.filter((x) => x.status === c.k).length;
                return (
                  <button
                    key={c.k}
                    onClick={() => onStatusFilterChange(c.k)}
                    className={`text-[12.5px] font-semibold px-3.25 py-1.75 rounded border transition-all cursor-pointer ${
                      active
                        ? 'bg-[#0F172A] text-white border-[#0F172A]'
                        : 'bg-white text-[#475569] border-[#E2E8F0] hover:border-slate-300'
                    }`}
                  >
                    {c.label}
                    <span className="opacity-60 ml-1.5">{cnt}</span>
                  </button>
                );
              })}
            </div>
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search contract, client, ID..."
              className="w-full md:w-[260px] p-2 px-3 border border-[#E2E8F0] rounded text-sm bg-white focus:border-accent"
            />
          </div>

          {/* Contracts Table */}
          <div className="bg-white border border-[#E2E8F0] rounded overflow-hidden">
            {sortedContracts.length === 0 ? (
              <div className="bg-white border-t border-[#E2E8F0] p-10 flex flex-col items-center justify-center text-center">
                <div className="text-4xl mb-3 opacity-50">📄</div>
                <h3 className="text-lg font-medium text-slate-800 mb-1">No contracts found</h3>
                <p className="text-slate-500 text-sm max-w-sm">
                  There are no contracts matching your current filters. Adjust your search or wait for new uploads.
                </p>
              </div>
            ) : (
              <>
                <table className="w-full border-collapse text-xs md:text-[13px]">
                  <thead>
                    <tr className="text-left bg-[#FCFCFD] border-b border-[#E2E8F0]">
                      {tableCols.map((col) => {
                        const isSorted = sortKey === col.k;
                        return (
                          <th key={col.k} className="p-3 px-4 font-semibold whitespace-nowrap">
                            <button
                              onClick={() => onSetSort(col.k)}
                              className="bg-transparent border-0 p-0 text-[#64748B] hover:text-[#0F172A] font-semibold text-[11px] tracking-[0.06em] uppercase flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              {col.label}
                              {isSorted && (
                                <span className="text-accent">
                                  {sortDir === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </button>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedContracts.map((c) => {
                      const sm = statusMeta[c.status];
                      const rm = c.level ? riskMeta[c.level] : null;
                      return (
                        <tr key={c.id} className="border-t border-[#F1F5F9] first:border-t-0 hover:bg-[#FAFAFB]">
                          <td className="p-3 px-4">
                            <div className="font-semibold text-[#0F172A] leading-tight">{c.name}</div>
                            <div className="font-mono text-[11px] text-[#94A3B8] mt-0.5">{c.id}</div>
                          </td>
                          <td className="p-3 px-4 text-[#475569]">{c.client}</td>
                          <td className="p-3 px-4">
                            <span className="font-mono text-[11px] bg-[#F1F5F9] text-[#475569] px-1.75 py-0.75 rounded">
                              {c.type}
                            </span>
                          </td>
                          <td className="p-3 px-4 text-[#475569]">{c.uploadedBy}</td>
                          <td className="p-3 px-4 text-[#64748B] whitespace-nowrap">{c.date}</td>
                          <td className="p-3 px-4">
                            <span style={pillStyle(sm.soft, sm.color)}>
                              ● {sm.label}
                            </span>
                          </td>
                          <td className="p-3 px-4">
                            {rm ? (
                              <span style={pillStyle(rm.soft, rm.text)}>
                                {rm.label} • {c.score}
                              </span>
                            ) : (
                              <span className="text-[#94A3B8] text-xs">Not scored</span>
                            )}
                          </td>
                          <td className="p-3 px-4 text-[#475569]">{c.reviewer}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="p-3 px-4 border-t border-[#F1F5F9] text-xs text-[#94A3B8]">
                  {sortedContracts.length} of {contracts.length} contracts
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
