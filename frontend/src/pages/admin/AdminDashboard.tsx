import React, { useEffect, useState } from 'react';
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

      {/* Additional layout for charts would go here (Recharts implementation omitted for brevity) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="h-96">
          <CardHeader>
            <CardTitle>System Activity</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-64">
            <p className="text-text-light">Chart visualization will render here.</p>
          </CardContent>
        </Card>
        <Card className="h-96">
          <CardHeader>
            <CardTitle>Recent Documents</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-64">
            <p className="text-text-light">Recent document list will render here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
