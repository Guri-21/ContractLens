import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Database, FileText, LockKeyhole, Scale, Shield, UserRound } from 'lucide-react';
import { AvailableUser, fetchAvailableUsers } from '../api/auth';
import { Button } from '../components/ui/Button';
import { useAuth } from '../lib/context/AuthContext';

type LoginRole = 'admin' | 'advisor';

const ROLE_COPY = {
  admin: {
    label: 'Admin',
    title: 'Choose Admin',
    description: 'Select the available admin account, then enter the admin password.',
    passwordHint: 'Password: 12345',
    icon: Shield,
    badge: 'Platform control',
    helper: 'Upload MSAs, assign advisors, monitor risk and audit logs.',
  },
  advisor: {
    label: 'Legal Advisor',
    title: 'Choose Legal Advisor',
    description: 'Each advisor has a separate password and its own assigned analysis portfolio.',
    passwordHint: 'Passwords: Advisor 1 = 1, Advisor 2 = 2, ... Advisor 5 = 5',
    icon: Scale,
    badge: 'Review workspace',
    helper: 'Select assigned MSAs, upload SOWs, review findings and redlines.',
  },
};

export default function SignIn() {
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState<LoginRole | null>(null);
  const [selectedUser, setSelectedUser] = useState<AvailableUser | null>(null);
  const [password, setPassword] = useState('');
  const [availableUsersByRole, setAvailableUsersByRole] = useState<{ admins: AvailableUser[]; advisors: AvailableUser[] }>({ admins: [], advisors: [] });
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const { login, isLoading } = useAuth();

  useEffect(() => {
    let active = true;

    async function loadAvailableUsers() {
      try {
        const users = await fetchAvailableUsers();
        if (!active) return;
        setAvailableUsersByRole(users);
      } catch (err: any) {
        if (!active) return;
        setError(err.message || 'Failed to load available users');
      } finally {
        if (active) setIsLoadingUsers(false);
      }
    }

    void loadAvailableUsers();
    return () => {
      active = false;
    };
  }, []);

  const availableUsers = useMemo(() => {
    if (selectedRole === 'admin') return availableUsersByRole.admins;
    if (selectedRole === 'advisor') return availableUsersByRole.advisors;
    return [];
  }, [availableUsersByRole, selectedRole]);

  const handleRoleSelect = (role: LoginRole) => {
    setError('');
    setPassword('');
    setSelectedUser(null);
    setSelectedRole(role);
  };

  const handleBack = () => {
    setError('');
    setPassword('');
    setSelectedUser(null);
    setSelectedRole(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedUser) {
      setError('Select a user first.');
      return;
    }

    setError('');
    try {
      await login(selectedUser.email, password);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-secondary p-6">
      <div className="mx-auto flex min-h-[calc(100vh-48px)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden border border-slate-200 bg-white shadow-xl shadow-slate-200/60 lg:grid-cols-[360px_1fr]">
          <aside className="bg-[#0F172A] p-8 text-white">
            <div className="flex items-center gap-2">
              <Shield className="h-7 w-7 text-accent" />
              <span className="font-serif text-xl font-bold tracking-wide">ContractLens</span>
            </div>
            <div className="mt-12">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-accent">Secure access</p>
              <h1 className="mt-3 font-serif text-4xl font-bold leading-tight">Choose your workspace.</h1>
              <p className="mt-4 text-sm leading-relaxed text-slate-300">
                Sign in as Admin to publish governing MSAs, or as a Legal Advisor to review assigned contract packages.
              </p>
            </div>
            <div className="mt-10 space-y-3 text-sm">
              <div className="flex gap-3 border border-slate-700 bg-slate-900/60 p-3">
                <Database className="mt-0.5 h-4 w-4 text-accent" />
                <span className="text-slate-300">Connected to seeded backend users and saved analyses.</span>
              </div>
              <div className="flex gap-3 border border-slate-700 bg-slate-900/60 p-3">
                <FileText className="mt-0.5 h-4 w-4 text-accent" />
                <span className="text-slate-300">Five advisor portfolios are ready for review.</span>
              </div>
            </div>
          </aside>

          <main className="p-8 lg:p-10">
            <div className="mb-8">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Secure login</p>
              <h2 className="mt-2 font-serif text-3xl font-bold text-text-dark">
                Select a seeded user
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-light">
                Access is scoped by role. Admin sees platform controls; advisors see only their assigned MSA/SOW analyses.
              </p>
            </div>

            {error && (
              <div className="mb-6 border border-status-danger/20 bg-status-danger/10 p-3 text-center text-sm font-medium text-status-danger">
                {error}
              </div>
            )}

            {!selectedRole ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <RoleCard
                  role="admin"
                  count={availableUsersByRole.admins.length}
                  disabled={isLoadingUsers || availableUsersByRole.admins.length === 0}
                  loading={isLoadingUsers}
                  onClick={() => handleRoleSelect('admin')}
                />
                <RoleCard
                  role="advisor"
                  count={availableUsersByRole.advisors.length}
                  disabled={isLoadingUsers || availableUsersByRole.advisors.length === 0}
                  loading={isLoadingUsers}
                  onClick={() => handleRoleSelect('advisor')}
                />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <button
                      type="button"
                      onClick={handleBack}
                      className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-text-light hover:text-text-dark"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to role selection
                    </button>
                    <h3 className="text-xl font-serif font-bold text-text-dark">
                      {ROLE_COPY[selectedRole].title}
                    </h3>
                    <p className="text-sm text-text-light mt-1">
                      {ROLE_COPY[selectedRole].description}
                    </p>
                  </div>
                  <div className="border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
                    {availableUsers.length} available
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setSelectedUser(user);
                        setPassword('');
                        setError('');
                      }}
                      className={`text-left border p-4 transition-all ${
                        selectedUser?.id === user.id
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-100 flex items-center justify-center text-slate-600">
                          <UserRound className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-text-dark truncate">{user.displayName}</div>
                          <div className="text-xs text-text-light truncate">{user.email}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="border border-slate-200 bg-slate-50 p-4">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-text-light mb-2">
                    Password for {selectedUser?.displayName || 'selected user'}
                  </label>
                  <div className="relative">
                    <LockKeyhole className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      disabled={!selectedUser || isLoading}
                      placeholder={selectedUser ? 'Enter password' : 'Select a user first'}
                      className="w-full rounded-md border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-slate-100"
                    />
                  </div>
                  <p className="text-xs text-text-light mt-2">{ROLE_COPY[selectedRole].passwordHint}</p>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full h-12"
                  isLoading={isLoading}
                  disabled={!selectedUser || !password}
                >
                  Sign In
                </Button>
              </form>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function RoleCard({
  role,
  count,
  disabled,
  loading,
  onClick,
}: {
  role: LoginRole;
  count: number;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  const copy = ROLE_COPY[role];
  const Icon = copy.icon;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="text-left border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
    >
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="w-11 h-11 bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <span className="bg-slate-100 px-3 py-1 text-xs font-semibold text-text-light">
          {loading ? 'Loading' : `${count} users`}
        </span>
      </div>
      <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">{copy.badge}</div>
      <div className="text-xl font-serif font-bold text-text-dark">{copy.label}</div>
      <p className="mt-2 text-sm leading-relaxed text-text-light">{copy.description}</p>
      <p className="mt-4 border-t border-slate-100 pt-4 text-xs leading-relaxed text-text-light">{copy.helper}</p>
    </button>
  );
}
