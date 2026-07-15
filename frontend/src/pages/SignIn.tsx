import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, LockKeyhole, Scale, Shield, UserRound } from 'lucide-react';
import { DemoUser, fetchDemoUsers } from '../api/auth';
import { Button } from '../components/ui/Button';
import { useAuth } from '../lib/context/AuthContext';

type LoginRole = 'admin' | 'advisor';

const ROLE_COPY = {
  admin: {
    label: 'Admin',
    title: 'Choose Admin',
    description: 'Select the available admin account, then enter the admin password.',
    passwordHint: 'Demo password: 12345',
    icon: Shield,
  },
  advisor: {
    label: 'Legal Advisor',
    title: 'Choose Legal Advisor',
    description: 'Each advisor has a separate password and its own assigned analysis portfolio.',
    passwordHint: 'Demo passwords: Advisor 1 = 1, Advisor 2 = 2, ... Advisor 5 = 5',
    icon: Scale,
  },
};

export default function SignIn() {
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState<LoginRole | null>(null);
  const [selectedUser, setSelectedUser] = useState<DemoUser | null>(null);
  const [password, setPassword] = useState('');
  const [demoUsers, setDemoUsers] = useState<{ admins: DemoUser[]; advisors: DemoUser[] }>({ admins: [], advisors: [] });
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const { login, isLoading } = useAuth();

  useEffect(() => {
    let active = true;

    async function loadDemoUsers() {
      try {
        const users = await fetchDemoUsers();
        if (!active) return;
        setDemoUsers(users);
      } catch (err: any) {
        if (!active) return;
        setError(err.message || 'Failed to load available users');
      } finally {
        if (active) setIsLoadingUsers(false);
      }
    }

    void loadDemoUsers();
    return () => {
      active = false;
    };
  }, []);

  const availableUsers = useMemo(() => {
    if (selectedRole === 'admin') return demoUsers.admins;
    if (selectedRole === 'advisor') return demoUsers.advisors;
    return [];
  }, [demoUsers, selectedRole]);

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
    <div className="min-h-screen bg-secondary flex items-center justify-center p-6">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
        </div>

        <h2 className="text-2xl font-serif font-bold text-center text-text-dark mb-2">
          ContractLens
        </h2>
        <p className="text-center text-text-light mb-8 text-sm">
          Choose a real seeded user from the connected database.
        </p>

        {error && (
          <div className="bg-status-danger/10 text-status-danger text-sm p-3 rounded-md mb-6 border border-status-danger/20 text-center font-medium">
            {error}
          </div>
        )}

        {!selectedRole ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RoleCard
              role="admin"
              count={demoUsers.admins.length}
              disabled={isLoadingUsers || demoUsers.admins.length === 0}
              onClick={() => handleRoleSelect('admin')}
            />
            <RoleCard
              role="advisor"
              count={demoUsers.advisors.length}
              disabled={isLoadingUsers || demoUsers.advisors.length === 0}
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
              <div className="rounded-md bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
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
                  className={`text-left rounded-lg border p-4 transition-all ${
                    selectedUser?.id === user.id
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
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

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
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

        <div className="mt-8 text-center text-xs text-slate-400">
          Seeded demo access uses the connected backend database.
        </div>
      </div>
    </div>
  );
}

function RoleCard({
  role,
  count,
  disabled,
  onClick,
}: {
  role: LoginRole;
  count: number;
  disabled: boolean;
  onClick: () => void;
}) {
  const copy = ROLE_COPY[role];
  const Icon = copy.icon;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="text-left rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
    >
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-text-light">
          {count} users
        </span>
      </div>
      <div className="text-xl font-serif font-bold text-text-dark">{copy.label}</div>
      <p className="mt-2 text-sm leading-relaxed text-text-light">{copy.description}</p>
    </button>
  );
}
