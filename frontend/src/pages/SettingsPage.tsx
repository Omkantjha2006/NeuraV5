import { useEffect, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { useTranslation, LANGUAGES } from '@/i18n/I18nContext';
import {
  User, Bell, Shield, Palette, Globe, Zap, Brain, Trash2, Plus, Save, Check, Loader2,
} from 'lucide-react';
import { memoryService, settingsService, userService } from '@/services/api';
import type { Memory, UserSettings } from '@/types';

const defaultSettings: UserSettings = {
  userId: '', defaultAgentId: 'general', theme: 'dark', language: 'en', customInstructions: '',
  streamingResponses: true, verboseResponses: false, autoSuggestFollowups: true, saveConversationHistory: true,
  emailNotifications: true, conversationResponses: true, documentProcessingNotifications: true,
  productUpdates: false, securityAlerts: true, allowDataTraining: false, activityTracking: true,
  codeSyntaxHighlighting: true, fontSize: 'medium',
};

export function SettingsPage() {
  const { user, navigate, setUser } = useApp();
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState('account');
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  const sections = [
    { id: 'account', label: t('settings.sections.account'), icon: <User size={18} /> },
    { id: 'notifications', label: t('settings.sections.notifications'), icon: <Bell size={18} /> },
    { id: 'appearance', label: t('settings.sections.appearance'), icon: <Palette size={18} /> },
    { id: 'privacy', label: t('settings.sections.privacy'), icon: <Shield size={18} /> },
    { id: 'preferences', label: t('settings.sections.preferences'), icon: <Zap size={18} /> },
    { id: 'language', label: t('settings.sections.language'), icon: <Globe size={18} /> },
    { id: 'memory', label: t('settings.sections.memory'), icon: <Brain size={18} /> },
  ];

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await settingsService.get();
        if (!cancelled && data) setSettings(data);
      } catch (error) {
        if (!cancelled) setStatus(error instanceof Error ? error.message : t('settings.unableToLoad'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [t]);

  const patchSettings = async (patch: Partial<UserSettings>) => {
    const previous = settings;
    const next = { ...settings, ...patch };
    setSettings(next);
    setSaving(true);
    setStatus('');
    try {
      const saved = await settingsService.update(patch);
      setSettings(saved);
      window.dispatchEvent(new CustomEvent('neura-settings-changed', { detail: saved }));
      setStatus(t('settings.saved'));
    } catch (error) {
      setSettings(previous);
      setStatus(error instanceof Error ? error.message : t('settings.unableToSave'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-ink-400">{t('common.loading')}</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto app-bg">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-2xl font-bold text-white mb-1">{t('settings.title')}</h1>
          <p className="text-ink-400">{t('settings.subtitle')}</p>
          {status && <p className="text-xs text-ink-400 mt-2">{status}</p>}
          {saving && <p className="text-xs text-primary-400 mt-1 inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> {t('settings.saving')}</p>}
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="md:w-56 shrink-0 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
            <div className="glass rounded-2xl p-2 space-y-0.5 md:sticky md:top-4">
              {sections.map((s) => (
                <button key={s.id} onClick={() => setActiveSection(s.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${activeSection === s.id ? 'bg-white/10 text-white' : 'text-ink-400 hover:bg-white/5 hover:text-white'}`}>
                  {s.icon}{s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            {activeSection === 'account' && <AccountSection user={user} onSaved={setUser} />}
            {activeSection === 'notifications' && <NotificationsSection settings={settings} onChange={patchSettings} />}
            {activeSection === 'appearance' && <AppearanceSection settings={settings} onChange={patchSettings} />}
            {activeSection === 'privacy' && <PrivacySection settings={settings} onChange={patchSettings} />}
            {activeSection === 'preferences' && <PreferencesSection settings={settings} onChange={patchSettings} />}
            {activeSection === 'language' && <LanguageSection settings={settings} onChange={patchSettings} />}
            {activeSection === 'memory' && <MemorySection settings={settings} onChange={patchSettings} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return <div className="glass rounded-2xl p-6 mb-4"><h2 className="text-lg font-semibold text-white mb-1">{title}</h2>{desc && <p className="text-sm text-ink-400 mb-5">{desc}</p>}{children}</div>;
}

function ToggleRow({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (value: boolean) => void }) {
  return <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"><div className="flex-1 min-w-0 pr-4"><p className="text-sm font-medium text-white">{label}</p><p className="text-xs text-ink-400 mt-0.5">{desc}</p></div><button onClick={() => onChange(!value)} aria-pressed={value} className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${value ? 'bg-primary-500' : 'bg-white/10'}`}><span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${value ? 'translate-x-5' : ''}`} /></button></div>;
}

function AccountSection({ user, onSaved }: { user: ReturnType<typeof useApp>['user']; onSaved: ReturnType<typeof useApp>['setUser'] }) {
  const { t } = useTranslation();
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  useEffect(() => setName(user?.name ?? ''), [user?.name]);
  const save = async () => {
    if (!name.trim() || name.trim() === user?.name) return;
    setSaving(true); setStatus('');
    try { const updated = await userService.updateProfile({ name: name.trim() }); onSaved(updated); setStatus(t('settings.account.profileUpdated')); }
    catch (error) { setStatus(error instanceof Error ? error.message : t('settings.account.unableToUpdate')); }
    finally { setSaving(false); }
  };
  return <SectionCard title={t('settings.account.title')} desc={t('settings.account.desc')}><div className="space-y-4">
    <div className="flex items-center gap-4 mb-4"><div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-xl font-semibold">{user?.name?.[0]?.toUpperCase() || 'A'}</div><div><p className="text-sm font-medium text-white">{user?.name}</p><p className="text-xs text-ink-400">{user?.plan} {t('settings.account.planSuffix')}</p></div></div>
    <div><label className="block text-sm font-medium text-ink-300 mb-1.5">{t('settings.account.name')}</label><input value={name} onChange={(e) => setName(e.target.value)} className="input-glass" /></div>
    <div><label className="block text-sm font-medium text-ink-300 mb-1.5">{t('settings.account.email')}</label><input type="email" value={user?.email ?? ''} readOnly className="input-glass opacity-70 cursor-not-allowed" /></div>
    <p className="text-xs text-ink-500">{t('settings.account.passwordNote')}</p>
    <button onClick={() => void save()} disabled={saving || !name.trim() || name.trim() === user?.name} className="btn-primary mt-2 inline-flex items-center gap-2">{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}{t('settings.account.saveChanges')}</button>
    {status && <p className="text-xs text-ink-400">{status}</p>}
  </div></SectionCard>;
}

function NotificationsSection({ settings, onChange }: { settings: UserSettings; onChange: (patch: Partial<UserSettings>) => Promise<void> }) {
  const { t } = useTranslation();
  return <SectionCard title={t('settings.notifications.title')} desc={t('settings.notifications.desc')}>
    <ToggleRow label={t('settings.notifications.email.label')} desc={t('settings.notifications.email.desc')} value={settings.emailNotifications} onChange={(v) => void onChange({ emailNotifications: v })} />
    <ToggleRow label={t('settings.notifications.conversationResponses.label')} desc={t('settings.notifications.conversationResponses.desc')} value={settings.conversationResponses} onChange={(v) => void onChange({ conversationResponses: v })} />
    <ToggleRow label={t('settings.notifications.documentProcessing.label')} desc={t('settings.notifications.documentProcessing.desc')} value={settings.documentProcessingNotifications} onChange={(v) => void onChange({ documentProcessingNotifications: v })} />
    <ToggleRow label={t('settings.notifications.productUpdates.label')} desc={t('settings.notifications.productUpdates.desc')} value={settings.productUpdates} onChange={(v) => void onChange({ productUpdates: v })} />
    <ToggleRow label={t('settings.notifications.securityAlerts.label')} desc={t('settings.notifications.securityAlerts.desc')} value={settings.securityAlerts} onChange={(v) => void onChange({ securityAlerts: v })} />
  </SectionCard>;
}

function AppearanceSection({ settings, onChange }: { settings: UserSettings; onChange: (patch: Partial<UserSettings>) => Promise<void> }) {
  const { t } = useTranslation();
  const themeLabels: Record<string, string> = {
    light: t('settings.appearance.themes.light'),
    dark: t('settings.appearance.themes.dark'),
    midnight: t('settings.appearance.themes.midnight'),
    system: t('settings.appearance.themes.system'),
  };
  const fontSizes = [
    { id: 'small', label: t('settings.appearance.fontSizes.small'), size: 'text-sm' },
    { id: 'medium', label: t('settings.appearance.fontSizes.medium'), size: 'text-base' },
    { id: 'large', label: t('settings.appearance.fontSizes.large'), size: 'text-lg' },
  ];
  return <><SectionCard title={t('settings.appearance.themeTitle')} desc={t('settings.appearance.themeDesc')}><div className="grid grid-cols-4 gap-3">{['light','dark','midnight','system'].map((theme) => <button key={theme} onClick={() => void onChange({ theme })} className={`relative rounded-xl p-4 border-2 transition-all ${settings.theme === theme ? 'border-primary-400' : 'border-white/10'}`}><div className={`w-full h-16 rounded-lg ${theme === 'light' ? 'bg-slate-100' : theme === 'dark' ? 'bg-ink-900' : theme === 'midnight' ? 'bg-ink-950' : 'bg-gradient-to-br from-ink-900 to-ink-800'} mb-2`} /><p className="text-sm text-white">{themeLabels[theme]}</p>{settings.theme === theme && <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center"><Check size={12} className="text-white" /></div>}</button>)}</div></SectionCard>
    <SectionCard title={t('settings.appearance.fontSizeTitle')} desc={t('settings.appearance.fontSizeDesc')}><div className="grid grid-cols-3 gap-3">{fontSizes.map((f) => <button key={f.id} onClick={() => void onChange({ fontSize: f.id })} className={`glass rounded-xl p-4 text-center transition-all ${settings.fontSize === f.id ? 'ring-2 ring-primary-400/50' : ''}`}><p className={`${f.size} text-white`}>Aa</p><p className="text-xs text-ink-400 mt-1">{f.label}</p></button>)}</div></SectionCard></>;
}

function DisabledToggleRow({ label, desc, note }: { label: string; desc: string; note: string }) {
  return <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 opacity-60">
    <div className="flex-1 min-w-0 pr-4">
      <p className="text-sm font-medium text-white">{label}</p>
      <p className="text-xs text-ink-400 mt-0.5">{desc}</p>
      <p className="text-xs text-ink-500 mt-1 italic">{note}</p>
    </div>
    <button disabled aria-pressed={false} className="relative w-11 h-6 rounded-full shrink-0 bg-white/10 cursor-not-allowed">
      <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white/60" />
    </button>
  </div>;
}

function PrivacySection({ settings, onChange }: { settings: UserSettings; onChange: (patch: Partial<UserSettings>) => Promise<void> }) {
  const { t } = useTranslation();
  return <SectionCard title={t('settings.privacy.title')} desc={t('settings.privacy.desc')}>
    <ToggleRow label={t('settings.privacy.saveHistory.label')} desc={t('settings.privacy.saveHistory.desc')} value={settings.saveConversationHistory} onChange={(v) => void onChange({ saveConversationHistory: v })} />
    {/* There is no data-training pipeline in this product yet, so this toggle can't
        actually do anything — showing it as an interactive on/off would tell people
        something false. It's disabled and labeled "coming soon" instead, the same
        way two-factor auth is below, until a real opt-in/opt-out mechanism exists. */}
    <DisabledToggleRow label={t('settings.privacy.allowTraining.label')} desc={t('settings.privacy.allowTraining.desc')} note={t('settings.privacy.allowTrainingComingSoon')} />
    <ToggleRow label={t('settings.privacy.activityTracking.label')} desc={t('settings.privacy.activityTracking.desc')} value={settings.activityTracking} onChange={(v) => void onChange({ activityTracking: v })} />
    <div className="pt-4"><p className="text-xs text-ink-500 mb-2">{t('settings.privacy.twoFactorNote')}</p><button disabled className="text-sm text-ink-500 cursor-not-allowed">{t('settings.privacy.twoFactorComingSoon')}</button></div>
  </SectionCard>;
}

function PreferencesSection({ settings, onChange }: { settings: UserSettings; onChange: (patch: Partial<UserSettings>) => Promise<void> }) {
  const { t } = useTranslation();
  return <SectionCard title={t('settings.preferences.title')} desc={t('settings.preferences.desc')}>
    <ToggleRow label={t('settings.preferences.streaming.label')} desc={t('settings.preferences.streaming.desc')} value={settings.streamingResponses} onChange={(v) => void onChange({ streamingResponses: v })} />
    <ToggleRow label={t('settings.preferences.syntaxHighlighting.label')} desc={t('settings.preferences.syntaxHighlighting.desc')} value={settings.codeSyntaxHighlighting} onChange={(v) => void onChange({ codeSyntaxHighlighting: v })} />
    <ToggleRow label={t('settings.preferences.autoSuggest.label')} desc={t('settings.preferences.autoSuggest.desc')} value={settings.autoSuggestFollowups} onChange={(v) => void onChange({ autoSuggestFollowups: v })} />
    <ToggleRow label={t('settings.preferences.verbose.label')} desc={t('settings.preferences.verbose.desc')} value={settings.verboseResponses} onChange={(v) => void onChange({ verboseResponses: v })} />
    <div className="pt-4"><label className="block text-sm font-medium text-ink-300 mb-2">{t('settings.preferences.defaultAgent')}</label><select value={settings.defaultAgentId} onChange={(e) => void onChange({ defaultAgentId: e.target.value })} className="input-glass cursor-pointer"><option value="general">Neura General</option><option value="code">Neura Code</option><option value="study">Neura Study</option><option value="research">Neura Research</option><option value="creative">Neura Creative</option></select></div>
  </SectionCard>;
}

function LanguageSection({ settings, onChange }: { settings: UserSettings; onChange: (patch: Partial<UserSettings>) => Promise<void> }) {
  const { t } = useTranslation();
  return <SectionCard title={t('settings.language.title')} desc={t('settings.language.desc')}><div className="space-y-1">{LANGUAGES.map((l) => <button key={l.id} onClick={() => void onChange({ language: l.id })} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${settings.language === l.id ? 'bg-white/10 text-white' : 'text-ink-400 hover:bg-white/5 hover:text-white'}`}>{l.label}{settings.language === l.id && <Check size={16} className="text-primary-400" />}</button>)}</div></SectionCard>;
}

function MemorySection({ settings, onChange }: { settings: UserSettings; onChange: (patch: Partial<UserSettings>) => Promise<void> }) {
  const { t } = useTranslation();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [newMemory, setNewMemory] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [customInstructions, setCustomInstructions] = useState(settings.customInstructions ?? '');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { void memoryService.list().then(setMemories).catch((e) => setStatus(e instanceof Error ? e.message : t('settings.memory.unableToLoad'))).finally(() => setLoading(false)); }, [t]);
  useEffect(() => setCustomInstructions(settings.customInstructions ?? ''), [settings.customInstructions]);
  const add = async () => { if (!newMemory.trim()) return; try { const item = await memoryService.create(newMemory.trim()); setMemories((current) => [item, ...current]); setNewMemory(''); setStatus(t('settings.memory.memorySaved')); } catch (e) { setStatus(e instanceof Error ? e.message : t('settings.memory.unableToSave')); } };
  const saveEdit = async (id: string) => { if (!editingText.trim()) return; try { const item = await memoryService.update(id, editingText.trim()); setMemories((current) => current.map((memory) => memory.id === id ? item : memory)); setEditingId(null); setStatus(t('settings.memory.memoryUpdated')); } catch (e) { setStatus(e instanceof Error ? e.message : t('settings.memory.unableToUpdate')); } };
  const remove = async (id: string) => { try { await memoryService.remove(id); setMemories((current) => current.filter((memory) => memory.id !== id)); } catch (e) { setStatus(e instanceof Error ? e.message : t('settings.memory.unableToDelete')); } };
  const clearAll = async () => { if (!window.confirm(t('settings.memory.confirmClearAll'))) return; try { await memoryService.clear(); setMemories([]); setStatus(t('settings.memory.allCleared')); } catch (e) { setStatus(e instanceof Error ? e.message : t('settings.memory.unableToClear')); } };
  const saveInstructions = async () => { await onChange({ customInstructions }); setStatus(t('settings.memory.personalizationSaved')); };
  return <>
    <SectionCard title={t('settings.memory.title')} desc={t('settings.memory.desc')}><div className="space-y-3">{loading ? <p className="text-sm text-ink-400">{t('settings.memory.loading')}</p> : memories.length === 0 ? <p className="text-sm text-ink-400">{t('settings.memory.empty')}</p> : memories.map((memory) => <div key={memory.id} className="glass rounded-xl p-4">{editingId === memory.id ? <><textarea value={editingText} onChange={(e) => setEditingText(e.target.value)} className="input-glass min-h-24 resize-y" /><div className="flex gap-2 mt-3"><button onClick={() => void saveEdit(memory.id)} className="btn-primary inline-flex items-center gap-2"><Save size={15}/>{t('common.save')}</button><button onClick={() => setEditingId(null)} className="btn-secondary">{t('common.cancel')}</button></div></> : <><p className="text-sm text-white leading-6">{memory.content}</p><div className="flex items-center justify-between gap-3 mt-3"><span className="text-xs text-ink-500">{memory.source === 'automatic' ? t('settings.memory.automatic') : t('settings.memory.manual')}</span><div className="flex gap-1"><button onClick={() => {setEditingId(memory.id);setEditingText(memory.content)}} className="px-2.5 py-1.5 text-xs text-ink-300 hover:text-white">{t('settings.memory.edit')}</button><button onClick={() => void remove(memory.id)} className="p-1.5 text-error-400 hover:text-error-300" title={t('common.delete')}><Trash2 size={15}/></button></div></div></>}</div>)}</div><div className="flex gap-2 mt-5"><input value={newMemory} onChange={(e) => setNewMemory(e.target.value)} onKeyDown={(e) => {if(e.key==='Enter')void add()}} className="input-glass" placeholder={t('settings.memory.addPlaceholder')}/><button onClick={() => void add()} className="btn-primary shrink-0 inline-flex items-center gap-2"><Plus size={16}/>{t('settings.memory.add')}</button></div><button onClick={() => void clearAll()} disabled={!memories.length} className="mt-5 text-sm text-error-400 hover:text-error-300 disabled:opacity-40">{t('settings.memory.clearAll')}</button></SectionCard>
    <SectionCard title={t('settings.memory.customInstructionsTitle')} desc={t('settings.memory.customInstructionsDesc')}><textarea value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} className="input-glass min-h-36 resize-y" placeholder={t('settings.memory.customInstructionsPlaceholder')}/><button onClick={() => void saveInstructions()} className="btn-primary mt-4">{t('settings.memory.savePersonalization')}</button>{status && <p className="text-xs text-ink-400 mt-3">{status}</p>}</SectionCard>
  </>;
}
