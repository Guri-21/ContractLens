import { NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../../lib/context/AuthContext';
import { Shield, LayoutDashboard, FileText, Users, BarChart3, History, Settings, LogOut } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/msa', label: 'MSA Repository', icon: FileText },
  { path: '/admin/advisors', label: 'Legal Advisors', icon: Users },
  { path: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/admin/audit', label: 'Audit Logs', icon: History },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout() {
  const { logout, email, role } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-background text-text">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
        <div className="h-16 flex items-center px-6 border-b border-slate-100 cursor-pointer" onClick={() => navigate('/admin/dashboard')}>
          <Shield className="w-6 h-6 text-primary mr-2" />
          <span className="font-serif font-bold text-lg text-text-dark tracking-wide">ContractLens</span>
        </div>
        
        <div className="px-6 py-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Admin Portal</div>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-text-light hover:bg-slate-50 hover:text-text-dark'
                }`
              }
            >
              <item.icon className="w-4 h-4 mr-3" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center px-3 py-2 mb-2 bg-slate-50 rounded-md border border-slate-100">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs mr-3">
              {email ? email.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-medium text-text-dark truncate">{email || 'Administrator'}</div>
              <div className="text-xs text-text-light">{role}</div>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center px-3 py-2 text-sm font-medium text-text-light hover:text-status-danger hover:bg-red-50 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4 mr-3" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-20">
          <h1 className="text-xl font-semibold text-text-dark font-serif tracking-tight">Organization Overview</h1>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
              System Active
            </span>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
