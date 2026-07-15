import { useState, useEffect, ReactNode } from 'react';

interface NavItem {
  k: string;
  label: string;
  badge?: number;
}

interface AppShellProps {
  role: 'admin' | 'reviewer';
  currentNav: string;
  onNavigate: (nav: string) => void;
  accentKey: 'gold' | 'crimson';
  onChangeAccent: (accent: 'gold' | 'crimson') => void;
  onSwitchRole: () => void;
  pendingContractsCount: number;
  children: ReactNode;
}

export default function AppShell({
  role,
  currentNav,
  onNavigate,
  accentKey,
  onChangeAccent,
  onSwitchRole,
  pendingContractsCount,
  children
}: AppShellProps) {
  const [backendConnected, setBackendConnected] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/health');
        setBackendConnected(res.ok);
      } catch {
        setBackendConnected(false);
      }
    };
    checkConnection();
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, []);
  const isAdmin = role === 'admin';
  
  const workspaceLabel = isAdmin ? 'Admin Console' : 'Legal Review & Analytics';
  const sectionLabel = isAdmin ? 'Administration' : 'Workspace';
  const roleLabel = isAdmin ? 'Admin' : 'Legal Advisor';
  const userName = isAdmin ? 'Jordan Okafor' : 'Alex Chen';
  const userInitials = isAdmin ? 'JO' : 'AC';

  const adminItems: NavItem[] = [
    { k: 'playbook', label: 'Playbook' },
    { k: 'users', label: 'Users & Roles' },
    { k: 'contracts', label: 'Contract Monitoring', badge: pendingContractsCount },
    { k: 'audit', label: 'Audit Trail' },
  ];

  const reviewerItems: NavItem[] = [
    { k: 'workspace', label: 'Review Workspace' },
    { k: 'dashboard', label: 'Analytics Overview' },
    { k: 'risk', label: 'Risk Analytics' },
    { k: 'clause', label: 'Clause Analytics' },
    { k: 'business', label: 'Business Analytics' },
    { k: 'document-viewer', label: 'Document Viewer' },
  ];

  const navItems = isAdmin ? adminItems : reviewerItems;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* TOP BAR */}
      <header className="h-[60px] flex-none bg-[#0F172A] flex items-center justify-between px-6 sticky top-0 z-30">
        <div className="flex items-center gap-3.5">
          <div className="font-mono text-sm tracking-[0.2em] text-[#F8FAFC] uppercase">
            Contract<span className="text-accent">Lens</span>
          </div>
          <div className="w-[1px] h-[22px] bg-[#334155]"></div>
          <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-[#94A3B8]">
            {workspaceLabel}
          </div>
          <div className="w-[1px] h-[22px] bg-[#334155]"></div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${backendConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#94A3B8]">
              {backendConnected ? 'Connected' : 'Offline Mode'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-[18px]">
          <div className="flex items-center gap-0 bg-[#1E293B] rounded p-[3px]">
            <span className="font-mono text-[9px] tracking-[0.12em] text-[#64748B] px-2 uppercase">
              Accent
            </span>
            <button
              onClick={() => onChangeAccent('gold')}
              className={`font-mono text-[11px] font-semibold px-[11px] py-[5px] rounded-[3px] transition-all ${
                accentKey === 'gold'
                  ? 'bg-[#9C7A3C] text-[#0F172A]'
                  : 'bg-transparent text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              Gold
            </button>
            <button
              onClick={() => onChangeAccent('crimson')}
              className={`font-mono text-[11px] font-semibold px-[11px] py-[5px] rounded-[3px] transition-all ${
                accentKey === 'crimson'
                  ? 'bg-[#8B2635] text-[#0F172A]'
                  : 'bg-transparent text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              Crimson
            </button>
          </div>
          
          <div className="w-[1px] h-[22px] bg-[#334155]"></div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-accent text-[#0F172A] flex items-center justify-center font-bold text-xs">
              {userInitials}
            </div>
            <div className="leading-tight">
              <div className="text-[13px] font-semibold text-[#F8FAFC] whitespace-nowrap">{userName}</div>
              <div className="text-[11px] text-[#94A3B8]">{roleLabel}</div>
            </div>
          </div>

          <button
            onClick={onSwitchRole}
            className="bg-transparent border border-[#334155] hover:border-[#64748B] text-[#CBD5E1] hover:text-[#F8FAFC] text-xs font-semibold px-3 py-1.5 rounded transition-colors"
          >
            Switch role
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* SIDEBAR */}
        <nav className="w-[246px] flex-none bg-white border-r border-[#E2E8F0] py-6.5 flex flex-col">
          <div className="px-5 pb-1">
            <div className="font-mono text-[10px] tracking-[0.2em] text-[#94A3B8] uppercase mb-3.5">
              {sectionLabel}
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-0.5">
            {navItems.map((n) => {
              const active = currentNav === n.k;
              return (
                <button
                  key={n.k}
                  onClick={() => onNavigate(n.k)}
                  className={`flex items-center justify-between w-full text-left px-5 py-2.5 text-[13.5px] font-medium transition-all ${
                    active
                      ? 'bg-accent-soft text-[#0F172A] font-semibold border-l-3 border-accent'
                      : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] border-l-3 border-transparent'
                  }`}
                >
                  <span>{n.label}</span>
                  {n.badge !== undefined && n.badge > 0 && (
                    <span
                      className={`text-[11px] font-bold px-1.5 py-0.2 rounded-full ${
                        active ? 'bg-accent text-white' : 'bg-[#E2E8F0] text-[#64748B]'
                      }`}
                    >
                      {n.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-auto px-5">
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded p-3.5">
              <div className="font-mono text-[10px] tracking-[0.1em] text-accent-text mb-1.5 uppercase font-medium">
                Active Jurisdiction
              </div>
              <div className="text-[13px] font-semibold text-[#0F172A]">United States</div>
              <div className="text-[11px] text-[#64748B]">Federal + Delaware</div>
            </div>
          </div>
        </nav>

        {/* MAIN VIEWS */}
        <main className="cl-scroll flex-1 min-w-0 overflow-y-auto px-10 py-[34px] pb-[60px]">
          <div className="max-w-[1160px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

