import React, { useState } from 'react';
import { useAuth } from '../lib/context/AuthContext';
import { Button } from '../components/ui/Button';
import { Shield, Scale } from 'lucide-react';

export default function SignIn() {
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();

  const handleQuickLogin = async (role: 'admin' | 'advisor') => {
    setError('');
    try {
      if (role === 'admin') {
        await login('admin@contractlens.com', 'admin123');
      } else {
        await login('reviewer@contractlens.com', 'reviewer123');
      }
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
          Select your role to access the Enterprise Portal
        </p>
        
        {error && (
          <div className="bg-status-danger/10 text-status-danger text-sm p-3 rounded-md mb-6 border border-status-danger/20 text-center font-medium">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <Button 
            variant="primary" 
            className="w-full h-14 text-base flex items-center justify-center gap-2" 
            isLoading={isLoading}
            onClick={() => handleQuickLogin('admin')}
          >
            <Shield className="w-5 h-5" />
            Sign in as Admin
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full h-14 text-base flex items-center justify-center gap-2 border-2" 
            isLoading={isLoading}
            onClick={() => handleQuickLogin('advisor')}
          >
            <Scale className="w-5 h-5" />
            Sign in as Legal Advisor
          </Button>
        </div>
        
        <div className="mt-8 text-center text-xs text-slate-400">
          Access is restricted to authorized personnel. <br/>
          Contact your administrator for credentials.
        </div>
      </div>
    </div>
  );
}
