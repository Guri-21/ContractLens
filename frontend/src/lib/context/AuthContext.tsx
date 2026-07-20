import { createContext, useContext, useState, ReactNode } from 'react';
import { login as apiLogin } from '../../api/auth';
import { useNavigate, useLocation } from 'react-router';
import { clearApiCache } from '../../api/cache';
import { clearAllSavedAnalysisCaches } from '../../reviewer-workspace/persistedAnalysis';
import { prefetchDocuments } from '../../api/documents';
import { fetchUsers } from '../../api/users';

interface AuthContextType {
  token: string | null;
  role: 'Admin' | 'Legal Reviewer' | null;
  email: string | null;
  login: (u: string, p: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [role, setRole] = useState<'Admin' | 'Legal Reviewer' | null>(localStorage.getItem('role') as any);
  const [email, setEmail] = useState<string | null>(localStorage.getItem('email'));
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const login = async (u: string, p: string) => {
    setIsLoading(true);
    try {
      const data = await apiLogin(u, p);
      clearApiCache();
      clearAllSavedAnalysisCaches();
      setToken(data.access_token);
      setRole(data.role);
      setEmail(data.email);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('email', data.email);
      if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);

      // Warm the cache in the background while the page navigates
      prefetchDocuments();
      fetchUsers().catch(() => {});

      if (data.role === 'Admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/advisor/dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearApiCache();
    clearAllSavedAnalysisCaches();
    setToken(null);
    setRole(null);
    setEmail(null);
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('role');
    localStorage.removeItem('email');
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ token, role, email, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const ProtectedRoute = ({ children, requireRole }: { children: ReactNode, requireRole?: 'Admin' | 'Legal Reviewer' }) => {
  const { token, role } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireRole && role !== requireRole) {
    // If Admin tries to access Advisor route, redirect to Admin dashboard, and vice-versa
    if (role === 'Admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/advisor/dashboard" replace />;
  }

  return <>{children}</>;
};

// We need to import Navigate for ProtectedRoute
import { Navigate } from 'react-router';
