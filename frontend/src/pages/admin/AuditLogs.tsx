import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertCircle, Clock, FileText, RefreshCw, ShieldCheck, User } from 'lucide-react';
import { fetchAuditLogs, AuditLogResponse } from '../../api/audit';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

const actionStyles: Record<string, string> = {
  UPLOAD_DOCUMENT: 'bg-blue-50 text-blue-700 border-blue-100',
  ADMIN_UPLOAD_MSA: 'bg-blue-50 text-blue-700 border-blue-100',
  ANALYZE_DOCUMENT: 'bg-purple-50 text-purple-700 border-purple-100',
  ANALYSIS_STARTED: 'bg-purple-50 text-purple-700 border-purple-100',
  ANALYSIS_COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  ANALYSIS_FAILED: 'bg-red-50 text-red-700 border-red-100',
  ASSIGN_MSA: 'bg-amber-50 text-amber-700 border-amber-100',
  UNASSIGN_MSA: 'bg-slate-50 text-slate-700 border-slate-100',
  CREATE_LEGAL_ADVISOR: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  DELETE_LEGAL_ADVISOR: 'bg-red-50 text-red-700 border-red-100',
  DELETE_DOCUMENT: 'bg-red-50 text-red-700 border-red-100',
  LOGIN_SUCCESS: 'bg-slate-50 text-slate-700 border-slate-100',
};

function formatAction(action: string) {
  return action
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function shortId(value?: string | null) {
  if (!value) return 'Not linked';
  return value.length > 10 ? `${value.slice(0, 8)}...` : value;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadLogs = async (force = false) => {
    if (force) setIsRefreshing(true);
    else setIsLoading(true);
    setError('');

    try {
      const data = await fetchAuditLogs({ force });
      setLogs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const stats = useMemo(() => {
    const uploads = logs.filter(log => log.action.includes('UPLOAD')).length;
    const analyses = logs.filter(log => log.action.includes('ANALYZE')).length;
    const uniqueUsers = new Set(logs.map(log => log.user_id)).size;
    return { uploads, analyses, uniqueUsers };
  }, [logs]);

  return (
    <div className="space-y-6 animate-cl-fade max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-text-dark">Audit Logs</h2>
          <p className="text-text-light text-sm mt-1">System-wide activity and security events.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => loadLogs(true)} isLoading={isRefreshing}>
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-text-light">Total Events</p>
            <p className="mt-2 text-3xl font-bold text-text-dark">{logs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-text-light">Uploads</p>
            <p className="mt-2 text-3xl font-bold text-blue-700">{stats.uploads}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-text-light">Analyses</p>
            <p className="mt-2 text-3xl font-bold text-purple-700">{stats.analyses}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-text-light">Active Users</p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">{stats.uniqueUsers}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 h-10 w-10 rounded-full bg-slate-200 animate-pulse" />
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <div className="h-6 w-36 rounded-full bg-slate-200 animate-pulse" />
                        <div className="h-5 w-24 rounded bg-slate-100 animate-pulse" />
                      </div>
                      <div className="flex gap-4">
                        <div className="h-4 w-28 rounded bg-slate-100 animate-pulse" />
                        <div className="h-4 w-32 rounded bg-slate-100 animate-pulse" />
                      </div>
                    </div>
                  </div>
                  <div className="h-4 w-28 rounded bg-slate-100 animate-pulse" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
              <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-text-light">No audit activity has been recorded yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {logs.map(log => (
                <div key={log.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${actionStyles[log.action] || 'bg-slate-50 text-slate-700 border-slate-100'}`}>
                          {formatAction(log.action)}
                        </span>
                        <span className="text-sm font-semibold text-text-dark">{log.target_type}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-text-light">
                        <span className="inline-flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          User {shortId(log.user_id)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          Target {shortId(log.target_id)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1 text-xs font-medium text-text-light md:justify-end">
                    <Clock className="w-3.5 h-3.5" />
                    {formatTimestamp(log.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
