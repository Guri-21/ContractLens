import React from 'react';

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
  userEmail?: string | null;
  children: React.ReactNode;
}

export default function AppShell({
  role,
  currentNav,
  onNavigate,
  accentKey,
  onChangeAccent,
  onSwitchRole,
  pendingContractsCount,
  userEmail,
  children
}: AppShellProps) {
  const isAdmin = role === 'admin';
  
  const workspaceLabel = isAdmin ? 'Admin Console' : 'Legal Review & Analytics';
  const sectionLabel = isAdmin ? 'Administration' : 'Workspace';
  const roleLabel = isAdmin ? 'Admin' : 'Legal Advisor';
  const displayEmail = userEmail || (isAdmin ? 'admin@contractlens.com' : 'advisor@contractlens.com');
  const userInitials = getInitials(displayEmail);

  const adminItems: NavItem[] = [
    { k: 'playbook', label: 'Playbook' },
    { k: 'country', label: 'Country Rules' },
    { k: 'users', label: 'Users & Roles' },
    { k: 'contracts', label: 'Contract Monitoring', badge: pendingContractsCount },
    { k: 'audit', label: 'Audit Trail' },
  ];

  const reviewerItems: NavItem[] = [
    { k: 'workspace', label: 'Review Workspace' },
    { k: 'analyses', label: 'Saved Analyses' },
    { k: 'dashboard', label: 'Analytics Overview' },
    { k: 'risk', label: 'Risk Analytics' },
    { k: 'clause', label: 'Clause Analytics' },
    { k: 'business', label: 'Business Analytics' },
  ];

  const navItems = isAdmin ? adminItems : reviewerItems;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* TOP BAR */}
      <header className="sticky top-0 z-30 flex min-h-[60px] flex-none flex-wrap items-center justify-between gap-3 bg-[#0F172A] px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="shrink-0 font-mono text-sm uppercase tracking-[0.2em] text-[#F8FAFC]">
            Contract<span className="text-accent">Lens</span>
          </div>
          <div className="hidden h-[22px] w-[1px] bg-[#334155] sm:block"></div>
          <div className="hidden truncate font-mono text-[11px] uppercase tracking-[0.14em] text-[#94A3B8] sm:block">
            {workspaceLabel}
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-[18px]">
          <div className="flex items-center gap-0 rounded bg-[#1E293B] p-[3px]">
            <span className="hidden px-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#64748B] sm:inline">
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
          
          <div className="hidden h-[22px] w-[1px] bg-[#334155] lg:block"></div>

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-[#0F172A]">
              {userInitials}
            </div>
            <div className="hidden leading-tight md:block">
              <div className="max-w-[220px] truncate text-[13px] font-semibold text-[#F8FAFC]" title={displayEmail}>{displayEmail}</div>
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

      <div className="flex min-h-0 flex-1">
        {/* SIDEBAR */}
        <nav className="hidden w-[246px] flex-none flex-col border-r border-[#E2E8F0] bg-white py-6.5 md:flex">
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
                Legal Grounding
              </div>
              <div className="text-[13px] font-semibold text-[#0F172A]">India</div>
              <div className="text-[11px] text-[#64748B]">Default statutory corpus</div>
            </div>
          </div>
        </nav>

        {/* MAIN VIEWS */}
        <main className="cl-scroll min-w-0 flex-1 overflow-y-auto px-4 py-6 pb-[60px] sm:px-6 lg:px-10 lg:py-[34px]">
          <div className="mx-auto max-w-[1160px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function getInitials(email: string): string {
  const localPart = email.split('@')[0] || email;
  const initials = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');
  return initials || email[0]?.toUpperCase() || 'U';
}
