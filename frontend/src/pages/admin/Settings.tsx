import { useEffect, useState } from 'react';
import { Database, FileCheck2, RefreshCw, Save, Shield, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { clearApiCache } from '../../api/cache';
import { fetchPlatformSettings, savePlatformSettings, PlatformSettings } from '../../api/settings';

const STORAGE_KEY = 'contractlens-platform-settings';

const defaultSettings: PlatformSettings = {
  indianLawGrounding: true,
  autoSaveAnalysis: true,
  showProgressiveResults: true,
  cacheEnabled: true,
  cacheTtlSeconds: 30,
  strictRefusalMode: true,
};

function readSettings(): PlatformSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-slate-300'}`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function SettingRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-4 border-b border-slate-100 last:border-0">
      <div>
        <p className="font-semibold text-text-dark">{title}</p>
        <p className="mt-1 text-sm text-text-light">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

export default function Settings() {
  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState('');
  const [error, setError] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      setError('');
      try {
        const backendSettings = await fetchPlatformSettings();
        setSettings(backendSettings);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(backendSettings));
      } catch (err: any) {
        const localSettings = readSettings();
        setSettings(localSettings);
        setError(err.message || 'Using locally saved settings because backend settings could not be loaded.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const update = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
    setSettings(current => ({ ...current, [key]: value }));
    setSavedAt('');
    setHasUnsavedChanges(true);
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setError('');
    const normalizedSettings = {
      ...settings,
      cacheTtlSeconds: Math.min(300, Math.max(5, Number(settings.cacheTtlSeconds) || 30)),
    };

    try {
      const savedSettings = await savePlatformSettings(normalizedSettings);
      setSettings(savedSettings);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedSettings));
      clearApiCache();
      setHasUnsavedChanges(false);
      setSavedAt(new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }));
    } catch (err: any) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedSettings));
      clearApiCache();
      setSettings(normalizedSettings);
      setHasUnsavedChanges(false);
      setSavedAt(new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }));
      setError(err.message || 'Backend save failed. Saved locally for this browser.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetSettings = async () => {
    setSettings(defaultSettings);
    setHasUnsavedChanges(true);
    setError('');
  };

  return (
    <div className="space-y-6 animate-cl-fade max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-text-dark">Platform Settings</h2>
          <p className="text-text-light text-sm mt-1">Configure platform preferences and admin console behavior.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={resetSettings}>
            <RefreshCw className="w-4 h-4" />
            Reset
          </Button>
          <Button className="gap-2" onClick={saveSettings} isLoading={isSaving} disabled={isLoading}>
            <Save className="w-4 h-4" />
            Save Settings
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-text-light">Refusal Mode</p>
                <p className="font-semibold text-text-dark">{settings.strictRefusalMode ? 'Strict' : 'Relaxed'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-text-light">Admin Cache</p>
                <p className="font-semibold text-text-dark">{settings.cacheEnabled ? `${settings.cacheTtlSeconds}s TTL` : 'Disabled'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-text-light">Saved</p>
                <p className="font-semibold text-text-dark">
                  {isLoading ? 'Loading' : hasUnsavedChanges ? 'Unsaved changes' : savedAt ? `Updated ${savedAt}` : 'Ready'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingRow
            title="Ground analysis on Indian laws by default"
            description="Use the ingested Indian law knowledge base when no uploaded playbook is selected."
            checked={settings.indianLawGrounding}
            onChange={value => update('indianLawGrounding', value)}
          />
          <SettingRow
            title="Auto-save completed analysis"
            description="Keep reviewer analysis available in Saved Analyses after leaving the page."
            checked={settings.autoSaveAnalysis}
            onChange={value => update('autoSaveAnalysis', value)}
          />
          <SettingRow
            title="Show progressive extraction and analysis"
            description="Display clauses and findings as they complete instead of waiting for the full run."
            checked={settings.showProgressiveResults}
            onChange={value => update('showProgressiveResults', value)}
          />
          <SettingRow
            title="Strict incomplete-data refusal"
            description="Do not evaluate clauses that depend on missing exhibits or external documents."
            checked={settings.strictRefusalMode}
            onChange={value => update('strictRefusalMode', value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cache & Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingRow
            title="Enable admin data cache"
            description="Reuse documents, users, audit logs, and analytics while switching admin tabs."
            checked={settings.cacheEnabled}
            onChange={value => update('cacheEnabled', value)}
          />
          <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-text-dark">Cache refresh window</p>
              <p className="mt-1 text-sm text-text-light">Backend changes from another session become visible after this window.</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={5}
                max={300}
                value={settings.cacheTtlSeconds}
                onChange={event => update('cacheTtlSeconds', Number(event.target.value))}
                onBlur={() => update('cacheTtlSeconds', Math.min(300, Math.max(5, Number(settings.cacheTtlSeconds) || 30)))}
                className="h-10 w-24 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <span className="text-sm font-medium text-text-light">seconds</span>
            </div>
          </div>
          <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0" />
              Save Settings writes these preferences to the backend. The cache time is used by admin API caching immediately after saving.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
