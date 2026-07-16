import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { fetchUsers, createUser, deleteUser, UserResponse } from '../../api/users';
import { fetchAdvisorAnalytics, AdvisorAnalyticsResponse } from '../../api/adminAnalytics';
import AdvisorAnalyticsModal from '../../components/admin/AdvisorAnalyticsModal';
import { UserPlus, Trash2, Mail, ShieldAlert, BarChart2, FileText, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LegalAdvisors() {
  const [advisors, setAdvisors] = useState<UserResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState('');
  
  const [analyticsData, setAnalyticsData] = useState<AdvisorAnalyticsResponse | null>(null);
  const [isFetchingAnalytics, setIsFetchingAnalytics] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadAdvisors = async () => {
    setIsLoading(true);
    try {
      const users = await fetchUsers();
      setAdvisors(users.filter(u => u.role === 'Legal Reviewer'));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdvisors();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    setIsSubmitting(true);
    setError('');
    try {
      await createUser({ email: newEmail });
      setNewEmail('');
      await loadAdvisors();
    } catch (err: any) {
      setError(err.message || 'Failed to add advisor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this advisor?')) return;
    try {
      await deleteUser(id);
      await loadAdvisors();
    } catch (err: any) {
      alert(err.message || 'Failed to remove advisor');
    }
  };

  const handleViewAnalytics = async (advisorId: string) => {
    setIsFetchingAnalytics(advisorId);
    try {
      const data = await fetchAdvisorAnalytics(advisorId);
      setAnalyticsData(data);
    } catch (error) {
      alert('Failed to load analytics for this advisor.');
    } finally {
      setIsFetchingAnalytics(null);
    }
  };

  return (
    <div className="space-y-6 animate-cl-fade max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-serif font-bold text-text-dark">Legal Advisors</h2>
        <p className="text-text-light text-sm mt-1">Manage platform access and monitor performance of your legal review team.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invite New Advisor</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex gap-4 items-start">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="advisor@enterprise.com"
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              {error && <p className="text-status-danger text-sm mt-2">{error}</p>}
            </div>
            <Button type="submit" variant="primary" className="gap-2" isLoading={isSubmitting}>
              <UserPlus className="w-4 h-4" />
              Invite
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-lg font-serif font-bold text-text-dark mb-4">Advisor Directory</h3>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-12 w-12 rounded-full bg-slate-200 animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-4 w-44 rounded bg-slate-200 animate-pulse" />
                      <div className="h-5 w-24 rounded-full bg-slate-100 animate-pulse" />
                    </div>
                  </div>
                  <div className="border-t border-slate-100 pt-4 space-y-2">
                    <div className="h-10 rounded-md bg-slate-200 animate-pulse" />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-8 rounded-md bg-slate-100 animate-pulse" />
                      <div className="h-8 rounded-md bg-slate-100 animate-pulse" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : advisors.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
            <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-text-light">No legal advisors found. Invite one above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {advisors.map(adv => (
              <Card key={adv.id} className="flex flex-col group hover:shadow-md transition-shadow">
                <CardContent className="p-6 flex-1 flex flex-col relative">
                  <button 
                    onClick={() => handleDelete(adv.id)}
                    className="absolute top-4 right-4 p-2 text-slate-300 hover:text-status-danger hover:bg-status-danger/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove Advisor"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center text-primary font-bold text-lg border border-primary/20">
                      {adv.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-text-dark truncate" title={adv.email}>{adv.email}</h4>
                      <span className="px-2 py-0.5 mt-1 inline-block rounded-full bg-blue-100 text-blue-700 text-[10px] uppercase font-bold tracking-wider">
                        {adv.role}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-slate-100">
                    <Button 
                      variant="primary" 
                      className="w-full justify-center gap-2" 
                      onClick={() => handleViewAnalytics(adv.id)}
                      isLoading={isFetchingAnalytics === adv.id}
                      disabled={isFetchingAnalytics !== null}
                    >
                      <BarChart2 className="w-4 h-4" />
                      View Analytics
                    </Button>
                    <div className="flex gap-2">
                      <Button 
                        variant="secondary" 
                        className="flex-1 justify-center gap-2 text-xs" 
                        onClick={() => navigate('/admin/msa')}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Documents
                      </Button>
                      <Button 
                        variant="secondary" 
                        className="flex-1 justify-center gap-2 text-xs" 
                        onClick={() => navigate('/admin/msa')}
                      >
                        Assign MSA
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {analyticsData && (
        <AdvisorAnalyticsModal 
          analytics={analyticsData} 
          onClose={() => setAnalyticsData(null)} 
        />
      )}
    </div>
  );
}
