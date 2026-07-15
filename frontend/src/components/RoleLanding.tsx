import { useState } from 'react';

type RoleKey = 'admin' | 'legal';

interface RoleLandingProps {
  onSelectRole: (role: RoleKey) => void;
  accentColor: string;
}

export default function RoleLanding({ onSelectRole, accentColor }: RoleLandingProps) {
  const [loginRole, setLoginRole] = useState<RoleKey | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const roleTiles = [
    {
      key: 'admin' as const,
      tag: 'Configure',
      name: 'Admin',
      desc: 'Playbooks, jurisdiction rules, users, system monitoring, and the audit trail.',
      cta: 'Enter workspace →',
      disabled: false,
      tagColor: accentColor,
      hoverClass: 'hover:border-accent hover:-translate-y-0.5',
      style: { border: '1px solid #334155' }
    },
    {
      key: 'legal' as const,
      tag: 'Review & Monitor',
      name: 'Legal & Compliance',
      desc: 'Aggregate risk posture, analytics, plus individual contract review and redlining.',
      cta: 'Enter workspace →',
      disabled: false,
      tagColor: '#38BDF8',
      hoverClass: 'hover:border-[#38BDF8] hover:-translate-y-0.5',
      style: { border: '1px solid #334155' }
    }
  ];

  const defaultCredentials: Record<string, { u: string; p: string; label: string }> = {
    admin: { u: 'admin@contractlens.com', p: 'admin123', label: 'Admin' },
    legal: { u: 'compliance@contractlens.com', p: 'compliance123', label: 'Legal & Compliance' }
  };

  const handleTileClick = async (tile: typeof roleTiles[number]) => {
    setError('');
    const defaults = defaultCredentials[tile.key];
    if (defaults) {
      setEmail(defaults.u);
      setPassword(defaults.p);
      await authenticate(tile.key, defaults.u, defaults.p);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginRole) return;
    await authenticate(loginRole, email, password);
  };

  const authenticate = async (roleKey: RoleKey, username: string, userPassword: string) => {
    setLoginRole(roleKey);
    
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', userPassword);

      const response = await fetch('http://localhost:8000/api/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Incorrect username or password');
      }

      const data = await response.json();
      
      const mappedRole = data.role.toLowerCase(); // e.g. "admin", "legal reviewer", "compliance officer"
      let expectedRoleKey = '';
      if (mappedRole === 'admin') expectedRoleKey = 'admin';
      else expectedRoleKey = 'legal'; // treat both legal reviewer and compliance officer as 'legal'

      if (expectedRoleKey !== roleKey) {
        throw new Error(`Role mismatch. This account (${data.role}) is not authorized to access the ${roleKey === 'admin' ? 'Admin' : 'Legal & Compliance'} workspace.`);
      }

      // Store JWT token details in localStorage
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('email', data.email);
      localStorage.setItem('role', data.role);

      setLoginRole(null);
      onSelectRole(roleKey);
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-10 bg-[#0F172A] bg-[radial-gradient(circle_at_50%_0%,_#1E293B_0%,_#0F172A_60%)] relative">
      <div className="text-center mb-11 animate-cl-rise">
        <div className="font-mono text-xs tracking-[0.34em] text-accent uppercase mb-4">
          Contract<span className="text-[#94A3B8]">Lens</span>
        </div>
        <h1 className="font-serif font-normal text-[44px] leading-[1.1] text-[#F8FAFC] mb-3">
          AI Contract Review, <span className="italic text-accent">governed.</span>
        </h1>
        <p className="text-[#94A3B8] text-[15px] max-w-[440px] mx-auto leading-relaxed">
          Choose a workspace. Access is scoped to your role — you only ever see what your role governs.
        </p>
      </div>

      <div className="flex gap-5 flex-wrap justify-center max-w-[1000px]">
        {roleTiles.map((t) => (
          <button
            key={t.key}
            onClick={() => !t.disabled && handleTileClick(t)}
            disabled={t.disabled}
            className={`w-[230px] text-left p-6 rounded-md bg-[#1E293B] transition-all duration-200 ${t.hoverClass}`}
            style={t.style}
          >
            <div
              className="font-mono text-[11px] tracking-[0.2em] uppercase mb-3.5"
              style={{ color: t.tagColor }}
            >
              {t.tag}
            </div>
            <div className="font-serif text-2xl text-[#F8FAFC] mb-2">{t.name}</div>
            <div className="text-sm text-[#94A3B8] line-clamp-3 leading-relaxed">{t.desc}</div>
            <div
              className="mt-[18px] text-xs font-semibold"
              style={{ color: t.disabled ? '#475569' : t.tagColor }}
            >
              {t.cta}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-10 font-mono text-[11px] text-[#475569] tracking-[0.06em]">
        DEMO • RUNNING ON HYBRID MODE • CONNECTED BACKEND SERVICE
      </div>

      {/* DYNAMIC SECURE LOGIN DIALOG OVERLAY */}
      {loginRole && (
        <div className="absolute inset-0 bg-[#0B0F19]/80 backdrop-blur-md flex items-center justify-center p-4 z-[200] animate-cl-fade">
          <div className="w-[380px] bg-[#1E293B] border border-[#334155] rounded-lg p-6 shadow-2xl animate-cl-rise">
            <div className="flex justify-between items-center mb-4.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-accent">
                Authentication Required
              </span>
              <button
                onClick={() => setLoginRole(null)}
                className="text-[#64748B] hover:text-[#F8FAFC] text-sm bg-transparent border-0 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <h3 className="font-serif text-xl text-[#F8FAFC] mb-1.5">
              Enter {loginRole === 'admin' ? 'Admin' : 'Legal & Compliance'} Workspace
            </h3>
            <p className="text-[#94A3B8] text-xs leading-normal mb-5">
              Sign in with your credentials to access this protected area.
            </p>

            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-[0.08em] text-[#94A3B8] mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@contractlens.com"
                  className="w-full p-2.5 rounded border border-[#334155] bg-[#0F172A] text-sm text-[#F8FAFC] focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-[0.08em] text-[#94A3B8] mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 rounded border border-[#334155] bg-[#0F172A] text-sm text-[#F8FAFC] focus:border-accent"
                />
              </div>

              {error && (
                <div className="bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs font-semibold p-2.5 rounded">
                  ⚠️ {error}
                </div>
              )}

              <div className="bg-[#111827] border border-[#273549] rounded p-2.5 mt-1 text-[11px] text-[#94A3B8] leading-relaxed">
                🔑 <strong>Test Credentials (Seeded):</strong>
                <div className="mt-1 font-mono text-[10px]">
                  <div>Email: {defaultCredentials[loginRole]?.u}</div>
                  <div>Password: {defaultCredentials[loginRole]?.p}</div>
                </div>
              </div>

              <div className="flex gap-2.5 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setLoginRole(null)}
                  className="bg-transparent hover:bg-[#334155]/30 text-[#94A3B8] hover:text-[#F8FAFC] text-xs font-semibold px-4 py-2.5 rounded cursor-pointer border border-[#334155]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-accent hover:bg-accent-hover text-white text-xs font-semibold px-4.5 py-2.5 rounded cursor-pointer transition-colors disabled:opacity-50"
                >
                  {loading ? 'Authenticating...' : 'Sign In & Enter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
