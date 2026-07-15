import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

export default function AuditLogs() {
  return (
    <div className="space-y-6 animate-cl-fade max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-serif font-bold text-text-dark">Audit Logs</h2>
        <p className="text-text-light text-sm mt-1">System-wide activity and security events.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mt-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-lg border border-slate-100 bg-slate-50/50">
                <div className="w-2 h-2 mt-2 rounded-full bg-slate-300 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-1/3 bg-slate-200 rounded animate-pulse" />
                    <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
                  </div>
                  <div className="h-3 w-2/3 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
