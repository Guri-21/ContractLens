import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { FileText, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { fetchBackendDocuments } from '../../api/documents';
import { fetchUsers } from '../../api/users';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ msas: 0, users: 0, highRisk: 0, completed: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [docs, users] = await Promise.all([
          fetchBackendDocuments(),
          fetchUsers()
        ]);
        
        // Basic calculation of stats from existing backend APIs
        const msas = Array.isArray(docs) ? docs.length : 0;
        const totalUsers = Array.isArray(users) ? users.length : 0;
        const completed = Array.isArray(docs) ? docs.filter(d => d.status === 'analyzed').length : 0;
        
        // Dummy high risk count based on logic or data
        let highRiskCount = 0;
        if (Array.isArray(docs)) {
          docs.forEach(d => {
            const clauses = d.clauses || [];
            const findings = clauses.flatMap((c: any) => c.risks || []);
            if (findings.some((f: any) => f.risk_level === 'high' || f.risk_level === 'critical')) {
              highRiskCount++;
            }
          });
        }
        
        setStats({ msas, users: totalUsers, highRisk: highRiskCount, completed });
      } catch (err) {
        console.error("Failed to load stats", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadStats();
  }, []);

  const statCards = [
    { title: 'Total MSAs', value: stats.msas, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'Legal Advisors', value: stats.users, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { title: 'High Risk Contracts', value: stats.highRisk, icon: AlertTriangle, color: 'text-status-danger', bg: 'bg-status-danger/10' },
    { title: 'Completed Reviews', value: stats.completed, icon: CheckCircle, color: 'text-status-success', bg: 'bg-emerald-100' },
  ];

  return (
    <div className="space-y-6 animate-cl-fade">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-text-dark">Dashboard</h2>
          <p className="text-text-light text-sm mt-1">Enterprise metrics and recent activity overview.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((s, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-light mb-1">{s.title}</p>
                {isLoading ? (
                  <div className="h-8 w-16 bg-slate-200 animate-pulse rounded" />
                ) : (
                  <h3 className="text-3xl font-bold text-text-dark">{s.value}</h3>
                )}
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${s.bg}`}>
                <s.icon className={`w-6 h-6 ${s.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>System Activity (Analytics)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-64 mt-4 w-full justify-between">
              {[40, 70, 45, 90, 65, 80, 55, 30].map((h, i) => (
                <div key={i} className="w-full bg-slate-100 rounded-t-md relative overflow-hidden" style={{ height: `${h}%` }}>
                   <div className="absolute inset-0 -translate-x-full animate-pulse bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4">
              <div className="h-4 w-12 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-12 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-12 bg-slate-100 rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Documents (MSAs & SOWs)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mt-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                  <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-slate-200 rounded animate-pulse" />
                  </div>
                  <div className="h-6 w-16 bg-slate-200 rounded-full animate-pulse flex-shrink-0" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Legal Advisors Directory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-3 font-medium text-sm text-text-light w-1/3">Name</th>
                    <th className="pb-3 font-medium text-sm text-text-light w-1/3">Role</th>
                    <th className="pb-3 font-medium text-sm text-text-light w-1/3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3].map((i) => (
                    <tr key={i} className="border-b border-slate-50 last:border-0">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
                          <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                      </td>
                      <td className="py-4 text-right">
                        <div className="inline-block h-6 w-20 bg-slate-200 rounded-full animate-pulse" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
