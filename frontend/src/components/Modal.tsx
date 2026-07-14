import { useState, useEffect } from 'react';

interface ModalProps {
  modalType: 'playbook' | 'user' | 'country' | 'export' | null;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
}

export default function Modal({ modalType, onClose, onSubmit, initialData }: ModalProps) {
  const [form, setForm] = useState<any>({});
  const [exportSel, setExportSel] = useState({
    dist: true,
    trend: true,
    clause: true,
    biz: false
  });

  useEffect(() => {
    if (modalType === 'playbook') {
      setForm({
        version: initialData?.version || 'v4.3',
        date: initialData?.date || 'Jul 14, 2026'
      });
    } else if (modalType === 'user') {
      setForm({
        id: initialData?.id || '',
        name: initialData?.name || '',
        email: initialData?.email || '',
        role: initialData?.role || 'Legal Reviewer'
      });
    } else {
      setForm({});
    }
  }, [modalType, initialData]);

  if (!modalType) return null;

  const handleConfirm = () => {
    if (modalType === 'export') {
      onSubmit(exportSel);
    } else {
      onSubmit(form);
    }
  };

  let eyebrow = '';
  let title = '';
  let subtitle = '';
  let confirmLabel = 'Save';

  if (modalType === 'playbook') {
    eyebrow = 'Playbook';
    title = 'Upload new playbook version';
    subtitle = 'Adds a version to history. Set it active from the table when ready.';
    confirmLabel = 'Upload version';
  } else if (modalType === 'user') {
    eyebrow = form.id ? 'Edit user' : 'New user';
    title = form.id ? 'Edit user' : 'Add a user';
    subtitle = 'One role per user determines workspace access.';
    confirmLabel = form.id ? 'Save changes' : 'Send invite';
  } else if (modalType === 'country') {
    eyebrow = 'Jurisdiction';
    title = 'Replace rule set';
    subtitle = 'Swap the active jurisdiction rule set.';
    confirmLabel = 'Activate rule set';
  } else if (modalType === 'export') {
    eyebrow = 'Export';
    title = 'Export analytics report';
    subtitle = 'Generate a PDF snapshot of the selected analytics.';
    confirmLabel = 'Generate PDF';
  }

  const roleChoices = [
    { name: 'Admin', desc: 'Full configuration & monitoring' },
    { name: 'Compliance Officer', desc: 'Analytics dashboards only' },
    { name: 'Legal Reviewer', desc: 'Contract review workspace' }
  ];

  const exportDefs = [
    { k: 'dist' as const, label: 'Risk distribution' },
    { k: 'trend' as const, label: 'Risk trend over time' },
    { k: 'clause' as const, label: 'Clause analytics' },
    { k: 'biz' as const, label: 'Business analytics' }
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-[#0F172A]/55 z-60 flex items-center justify-center p-6 animate-cl-fade"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-md w-full max-w-[520px] shadow-[0_20px_60px_rgba(15,23,42,0.3)] animate-cl-rise overflow-hidden"
      >
        <div className="p-[22px] px-[26px] pb-0">
          <div className="font-mono text-[11px] tracking-[0.14em] text-accent-text uppercase mb-2">
            {eyebrow}
          </div>
          <h2 className="font-serif font-normal text-2xl text-[#0F172A] mb-1">{title}</h2>
          <p className="text-[13px] text-[#64748B] mb-5">{subtitle}</p>
        </div>

        <div className="px-[26px]">
          {/* PLAYBOOK UPLOAD */}
          {modalType === 'playbook' && (
            <>
              <div className="border-2 border-dashed border-[#E2E8F0] rounded-md p-6.5 text-center mb-4 bg-[#FCFCFD]">
                <div className="text-2xl mb-1.5 text-accent">⬇</div>
                <div className="text-[13.5px] text-[#334155] font-semibold">Drop playbook documents here</div>
                <div className="text-xs text-[#94A3B8] mt-0.5">PDF or DOCX • multiple files allowed</div>
              </div>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">Version label</label>
              <input
                value={form.version || ''}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                className="w-full p-2.5 border border-[#E2E8F0] rounded text-sm mb-3.5 focus:border-accent"
              />
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">Effective date</label>
              <input
                value={form.date || ''}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full p-2.5 border border-[#E2E8F0] rounded text-sm mb-1.5 focus:border-accent"
              />
            </>
          )}

          {/* USER ADD/EDIT */}
          {modalType === 'user' && (
            <>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">Full name</label>
              <input
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full p-2.5 border border-[#E2E8F0] rounded text-sm mb-3.5 focus:border-accent"
                placeholder="John Doe"
              />
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">Email</label>
              <input
                value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full p-2.5 border border-[#E2E8F0] rounded text-sm mb-3.5 focus:border-accent"
                placeholder="john.doe@contractlens.io"
              />
              <label className="block text-xs font-semibold text-[#334155] mb-2">
                Role — grants access to one workspace
              </label>
              <div className="flex flex-col gap-2 mb-1.5">
                {roleChoices.map((choice) => {
                  const sel = form.role === choice.name;
                  return (
                    <button
                      key={choice.name}
                      onClick={() => setForm({ ...form, role: choice.name })}
                      className={`flex justify-between items-center w-full text-left p-3 border rounded-md transition-all ${
                        sel
                          ? 'border-accent bg-accent-soft text-accent-text font-medium'
                          : 'border-[#E2E8F0] bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-[13.5px]">{choice.name}</div>
                        <div className="text-xs text-[#64748B]">{choice.desc}</div>
                      </div>
                      {sel && <span className="text-accent font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* COUNTRY COMPLIANCE RULES */}
          {modalType === 'country' && (
            <>
              <div className="bg-accent-soft rounded p-3.5 text-[12.5px] text-accent-text leading-relaxed mb-4">
                Replacing the rule set retires the current United States set and activates the new upload. Only one jurisdiction is enforced at a time.
              </div>
              <div className="border-2 border-dashed border-[#E2E8F0] rounded-md p-6.5 text-center bg-[#FCFCFD]">
                <div className="text-2xl mb-1.5 text-accent">⬇</div>
                <div className="text-[13.5px] text-[#334155] font-semibold">Drop jurisdiction rule set</div>
                <div className="text-xs text-[#94A3B8] mt-0.5">Structured ruleset file (.json / .yaml)</div>
              </div>
            </>
          )}

          {/* EXPORT ANALYTICS REPORT */}
          {modalType === 'export' && (
            <>
              <div className="text-xs font-semibold text-[#334155] mb-2.5">Sections to include</div>
              <div className="flex flex-col gap-0.5 mb-4">
                {exportDefs.map((def) => {
                  const on = exportSel[def.k];
                  return (
                    <label
                      key={def.k}
                      onClick={() => setExportSel({ ...exportSel, [def.k]: !on })}
                      className="flex items-center gap-2.5 p-2 rounded cursor-pointer text-[13.5px] text-[#334155] hover:bg-[#F8FAFC]"
                    >
                      <span
                        className={`w-[17px] h-[17px] rounded border flex items-center justify-center text-[11px] leading-none transition-all ${
                          on
                            ? 'border-accent bg-accent text-white'
                            : 'border-[#CBD5E1] bg-white'
                        }`}
                      >
                        {on && '✓'}
                      </span>
                      {def.label}
                    </label>
                  );
                })}
              </div>
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded p-3 text-xs text-[#64748B] mb-1.5">
                Output format: <strong className="text-[#0F172A]">PDF</strong> • DOCX / Excel export is out of scope for this build.
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2.5 p-5 px-[26px] pb-[22px]">
          <button
            onClick={onClose}
            className="bg-transparent border border-[#E2E8F0] hover:border-slate-300 text-[#334155] text-xs font-semibold px-4 py-2.2 rounded cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="bg-accent hover:bg-accent-hover text-white font-semibold text-xs px-4.5 py-2.2 rounded cursor-pointer transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
