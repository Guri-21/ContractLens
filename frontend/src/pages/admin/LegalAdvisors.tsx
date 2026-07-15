import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { fetchUsers, createUser, deleteUser, UserResponse } from '../../api/users';
import { UserPlus, Trash2, Mail, ShieldAlert } from 'lucide-react';

export default function LegalAdvisors() {
  const [advisors, setAdvisors] = useState<UserResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState('');

  const loadAdvisors = async () => {
    setIsLoading(true);
    try {
      const users = await fetchUsers();
      // Filter out admins if you only want to see reviewers, or show all
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

  return (
    <div className="space-y-6 animate-cl-fade max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-serif font-bold text-text-dark">Legal Advisors</h2>
        <p className="text-text-light text-sm mt-1">Manage platform access for your legal review team.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Advisor</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex gap-4 items-start">
            <div className="flex-1">
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

      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-3 font-medium text-sm text-text-light pl-4">Email / ID</th>
                  <th className="pb-3 font-medium text-sm text-text-light">Role</th>
                  <th className="pb-3 font-medium text-sm text-text-light text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [1, 2, 3].map((i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="py-4 pl-4"><div className="h-4 w-48 bg-slate-200 animate-pulse rounded" /></td>
                      <td className="py-4"><div className="h-4 w-24 bg-slate-200 animate-pulse rounded" /></td>
                      <td className="py-4 text-right pr-4"><div className="inline-block h-8 w-8 bg-slate-200 animate-pulse rounded" /></td>
                    </tr>
                  ))
                ) : advisors.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-text-light">
                      <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      No legal advisors found. Invite one above.
                    </td>
                  </tr>
                ) : (
                  advisors.map(adv => (
                    <tr key={adv.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 pl-4">
                        <div className="font-medium text-text-dark">{adv.email}</div>
                        <div className="text-xs text-text-light font-mono mt-0.5">{adv.id.split('-')[0]}...</div>
                      </td>
                      <td className="py-4">
                        <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                          {adv.role}
                        </span>
                      </td>
                      <td className="py-4 text-right pr-4">
                        <button
                          onClick={() => handleDelete(adv.id)}
                          className="p-2 text-slate-400 hover:text-status-danger hover:bg-status-danger/10 rounded-md transition-colors"
                          title="Remove Advisor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
