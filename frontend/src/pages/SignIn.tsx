import { useState } from 'react';
import { useAuth } from '../lib/context/AuthContext';
import { Button } from '../components/ui/Button';
import { Shield, Scale, ArrowLeft } from 'lucide-react';

export default function SignIn() {
  const [error, setError] = useState('');
  const [view, setView] = useState<'role' | 'admin' | 'advisor'>('role');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const { login, isLoading } = useAuth();

  const handleRoleSelect = (role: 'admin' | 'advisor') => {
    setView(role);
    setError('');
    if (role === 'admin') {
      setEmail('admin@contractlens.com');
      setPassword('');
    } else {
      setEmail('');
      setPassword('');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            {view === 'admin' ? <Shield className="w-6 h-6 text-primary" /> : <Scale className="w-6 h-6 text-primary" />}
          </div>
        </div>
        
        <h2 className="text-2xl font-serif font-bold text-center text-text-dark mb-2">
          ContractLens
        </h2>
        <p className="text-center text-text-light mb-8 text-sm">
          {view === 'role' ? 'Select your role to access the Enterprise Portal' : `Sign in as ${view === 'admin' ? 'Administrator' : 'Legal Advisor'}`}
        </p>
        
        {error && (
          <div className="bg-status-danger/10 text-status-danger text-sm p-3 rounded-md mb-6 border border-status-danger/20 text-center font-medium">
            {error}
          </div>
        )}

        {view === 'role' ? (
          <div className="space-y-4">
            <Button 
              variant="primary" 
              className="w-full h-14 text-base flex items-center justify-center gap-2" 
              onClick={() => handleRoleSelect('admin')}
            >
              <Shield className="w-5 h-5" />
              Sign in as Admin
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full h-14 text-base flex items-center justify-center gap-2 border-2" 
              onClick={() => handleRoleSelect('advisor')}
            >
              <Scale className="w-5 h-5" />
              Sign in as Legal Advisor
            </Button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <div className="pt-2 flex flex-col gap-3">
              <Button 
                type="submit"
                variant="primary" 
                className="w-full h-12 text-base" 
                isLoading={isLoading}
              >
                Sign In
              </Button>
              <Button 
                type="button"
                variant="outline" 
                className="w-full h-12 text-base flex items-center justify-center gap-2" 
                onClick={() => setView('role')}
                disabled={isLoading}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Role Selection
              </Button>
            </div>
          </form>
        )}
        
        <div className="mt-8 text-center text-xs text-slate-400">
          Access is restricted to authorized personnel. <br/>
          Contact your administrator for credentials.
        </div>
      </div>
    </div>
  );
}
