import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Loader } from 'lucide-react';
import { 
  PlaybookRule, 
  fetchPlaybookRules, 
  createPlaybookRule, 
  updatePlaybookRule, 
  deletePlaybookRule 
} from '../../api/playbook';

export default function PlaybookEditor() {
  const [rules, setRules] = useState<PlaybookRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchPlaybookRules();
      setRules(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load playbook rules');
      // Fallback seed list for offline/standalone demo mode
      setRules([
        { id: '1', title: 'Net 30 Payment Terms', description: 'All payment terms must be Net 30 or better.', is_active: true },
        { id: '2', title: 'Delaware Governing Law', description: 'Governing law must be set to the State of Delaware.', is_active: true },
        { id: '3', title: 'Mutual Indemnification', description: 'Indemnification clauses must be reciprocal and mutual.', is_active: true }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDesc) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const newRule = await createPlaybookRule({
        title: formTitle,
        description: formDesc,
        is_active: true
      });
      setRules([...rules, newRule]);
      setSuccess('Playbook rule created successfully');
      setFormTitle('');
      setFormDesc('');
      setIsAdding(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create playbook rule');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!formTitle || !formDesc) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const updatedRule = await updatePlaybookRule(id, {
        title: formTitle,
        description: formDesc,
        is_active: true
      });
      setRules(rules.map(r => r.id === id ? updatedRule : r));
      setSuccess('Playbook rule updated successfully');
      setEditingId(null);
      setFormTitle('');
      setFormDesc('');
    } catch (err: any) {
      setError(err.message || 'Failed to update playbook rule');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this playbook rule?')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await deletePlaybookRule(id);
      setRules(rules.filter(r => r.id !== id));
      setSuccess('Playbook rule deleted successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to delete playbook rule');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (rule: PlaybookRule) => {
    if (!rule.id) return;
    setLoading(true);
    try {
      const updated = await updatePlaybookRule(rule.id, {
        title: rule.title,
        description: rule.description,
        is_active: !rule.is_active
      });
      setRules(rules.map(r => r.id === rule.id ? updated : r));
      setSuccess(`Rule status changed to ${!rule.is_active ? 'Active' : 'Inactive'}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update rule status');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (rule: PlaybookRule) => {
    if (!rule.id) return;
    setEditingId(rule.id);
    setFormTitle(rule.title);
    setFormDesc(rule.description);
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormTitle('');
    setFormDesc('');
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-md overflow-hidden animate-cl-rise">
      <div className="p-4 px-5 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
        <div>
          <h2 className="font-serif text-lg text-[#0F172A]">Interactive Playbook Rules</h2>
          <p className="text-xs text-[#64748B] mt-0.5">Directly add, modify, or delete rule definitions evaluated by the AI review engine.</p>
        </div>
        {!isAdding && !editingId && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-accent hover:bg-accent-hover text-white text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer border-0 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Rule
          </button>
        )}
      </div>

      <div className="p-5 space-y-4">
        {error && (
          <div className="bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs font-semibold p-3 rounded">
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div className="bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs font-semibold p-3 rounded">
            ✓ {success}
          </div>
        )}

        {/* Add Form */}
        {isAdding && (
          <form onSubmit={handleCreate} className="bg-slate-50 border border-[#E2E8F0] rounded-md p-4 space-y-3">
            <h3 className="font-semibold text-xs text-[#0F172A] uppercase tracking-wider">Create New Rule</h3>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[#64748B] mb-1">Rule Title</label>
              <input
                type="text"
                required
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Net 30 Payment Terms"
                className="w-full p-2 border border-[#E2E8F0] rounded text-xs bg-white focus:border-accent outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[#64748B] mb-1">Rule Description</label>
              <textarea
                required
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Detailed logic the AI model will evaluate contracts against..."
                rows={3}
                className="w-full p-2 border border-[#E2E8F0] rounded text-xs bg-white focus:border-accent outline-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="bg-transparent hover:bg-slate-200/50 text-[#64748B] text-xs font-semibold px-3 py-1.5 rounded cursor-pointer border border-[#E2E8F0]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-accent hover:bg-accent-hover text-white text-xs font-semibold px-3.5 py-1.5 rounded cursor-pointer border-0"
              >
                Save Rule
              </button>
            </div>
          </form>
        )}

        {/* Rules List */}
        {loading && rules.length === 0 ? (
          <div className="flex justify-center items-center py-10">
            <Loader className="w-6 h-6 text-accent animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => {
              const isEditing = editingId === rule.id;
              return (
                <div 
                  key={rule.id}
                  className={`border rounded-md p-4 transition-all duration-200 ${
                    rule.is_active ? 'border-[#E2E8F0] bg-white' : 'border-slate-100 bg-slate-50/50 opacity-70'
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-[#64748B] mb-1">Rule Title</label>
                        <input
                          type="text"
                          required
                          value={formTitle}
                          onChange={(e) => setFormTitle(e.target.value)}
                          className="w-full p-2 border border-[#E2E8F0] rounded text-xs bg-white focus:border-accent outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-[#64748B] mb-1">Rule Description</label>
                        <textarea
                          required
                          value={formDesc}
                          onChange={(e) => setFormDesc(e.target.value)}
                          rows={2}
                          className="w-full p-2 border border-[#E2E8F0] rounded text-xs bg-white focus:border-accent outline-none"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="bg-transparent hover:bg-slate-200/50 text-[#64748B] text-xs font-semibold px-3 py-1.5 rounded cursor-pointer border border-[#E2E8F0]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => rule.id && handleUpdate(rule.id)}
                          className="bg-accent hover:bg-accent-hover text-white text-xs font-semibold px-3.5 py-1.5 rounded cursor-pointer border-0"
                        >
                          Update
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-semibold text-sm text-[#0F172A] flex items-center gap-2">
                          {rule.title}
                          {!rule.is_active && (
                            <span className="bg-slate-200 text-[#475569] text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded">
                              Disabled
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-[#475569] leading-relaxed mt-1">{rule.description}</p>
                      </div>

                      <div className="flex items-center gap-2 flex-none">
                        <button
                          onClick={() => handleToggleActive(rule)}
                          title={rule.is_active ? 'Deactivate rule' : 'Activate rule'}
                          className="p-1.5 rounded hover:bg-slate-100 text-[#64748B] hover:text-[#0F172A] border-0 bg-transparent cursor-pointer"
                        >
                          {rule.is_active ? <ToggleRight className="w-5 h-5 text-accent" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => startEdit(rule)}
                          className="p-1.5 rounded hover:bg-slate-100 text-[#64748B] hover:text-[#0F172A] border-0 bg-transparent cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => rule.id && handleDelete(rule.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-[#64748B] hover:text-red-700 border-0 bg-transparent cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
