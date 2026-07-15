import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../lib/context/AuthContext';
import { Button } from '../components/ui/Button';
import { Shield } from 'lucide-react';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
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
            <Shield className="w-6 h-6 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-serif font-bold text-center text-text-dark mb-2">
          ContractLens
        </h2>
        <p className="text-center text-text-light mb-8 text-sm">
          Sign in to the Enterprise Portal
        </p>
        
        {error && (
          <div className="bg-status-danger/10 text-status-danger text-sm p-3 rounded-md mb-6 border border-status-danger/20 text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1.5">Email Address</label>
            <input 
              type="email" 
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="advisor@enterprise.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1.5">Password</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          
          <Button type="submit" variant="primary" className="w-full mt-2" isLoading={isLoading}>
            Authenticate
          </Button>
        </form>
        
        <div className="mt-8 text-center text-xs text-slate-400">
          Access is restricted to authorized personnel. <br/>
          Contact your administrator for credentials.
        </div>
      </div>
    </div>
  );
}
