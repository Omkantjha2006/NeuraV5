import { useMemo, useState } from 'react';
import {
  BookOpen, Brain, CheckCircle2, ClipboardList, Clock3, FileText, HelpCircle,
  Layers3, ListChecks, Loader2, RefreshCw, Sparkles, Target, Trophy,
} from 'lucide-react';
import { studyService } from '@/services/api';
import { useApp } from '@/store/AppContext';
import { useTranslation } from '@/i18n/I18nContext';

type StudyMode = 'notes' | 'explain' | 'mcq' | 'flashcards' | 'quiz' | 'study-plan' | 'exam' | 'solve' | 'revision';

type Mode = { id: StudyMode; icon: typeof BookOpen };

const MODE_ICONS: Mode[] = [
  { id: 'notes', icon: FileText },
  { id: 'explain', icon: Brain },
  { id: 'mcq', icon: ListChecks },
  { id: 'flashcards', icon: Layers3 },
  { id: 'quiz', icon: HelpCircle },
  { id: 'study-plan', icon: Clock3 },
  { id: 'exam', icon: ClipboardList },
  { id: 'solve', icon: Target },
  { id: 'revision', icon: RefreshCw },
];

export function StudyPage() {
  const { activeAgentId } = useApp();
  const { t } = useTranslation();
  const [mode, setMode] = useState<StudyMode>('notes');
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const MODES = useMemo(() => MODE_ICONS.map((m) => ({
    ...m,
    label: t(`study.modes.${m.id}.label`),
    description: t(`study.modes.${m.id}.description`),
  })), [t]);

  const selected = useMemo(() => MODES.find((item) => item.id === mode)!, [mode, MODES]);

  const generate = async () => {
    if (!topic.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      const response = await studyService.generate({ mode, topic, context, agentId: activeAgentId === 'study' ? 'study' : 'study' });
      setResult(response.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('study.genericError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-primary-300 text-sm font-medium">
              <Sparkles size={16} /> {t('study.badge')}
            </div>
            <h1 className="text-2xl font-bold text-white">{t('study.title')}</h1>
            <p className="mt-1 text-sm text-ink-400">{t('study.subtitle')}</p>
          </div>
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-xs text-emerald-300">
            {t('study.specializedBadge')}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <section className="glass-panel rounded-2xl p-3 h-fit">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-ink-500">{t('study.toolsHeading')}</p>
            <div className="space-y-1">
              {MODES.map((item) => {
                const Icon = item.icon;
                const active = item.id === mode;
                return (
                  <button
                    key={item.id}
                    onClick={() => setMode(item.id)}
                    className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${active ? 'bg-emerald-500/15 border border-emerald-400/20' : 'hover:bg-white/5 border border-transparent'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={17} className={active ? 'text-emerald-300' : 'text-ink-400'} />
                      <div className="min-w-0">
                        <div className={`text-sm font-medium ${active ? 'text-white' : 'text-ink-200'}`}>{item.label}</div>
                        <div className="truncate text-[11px] text-ink-500">{item.description}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-5">
            <div className="glass-panel rounded-2xl p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl bg-emerald-500/10 p-2.5"><BookOpen size={20} className="text-emerald-300" /></div>
                <div>
                  <h2 className="font-semibold text-white">{selected.label}</h2>
                  <p className="text-xs text-ink-500">{selected.description}</p>
                </div>
              </div>

              <label className="mb-2 block text-xs font-medium text-ink-300">{t('study.topicLabel')}</label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={mode === 'solve' ? t('study.topicPlaceholderSolve') : t('study.topicPlaceholderDefault')}
                className="input-glass min-h-[120px] resize-y"
              />

              <label className="mb-2 mt-4 block text-xs font-medium text-ink-300">{t('study.contextLabel')} <span className="text-ink-600">{t('study.contextOptional')}</span></label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder={t('study.contextPlaceholder')}
                className="input-glass min-h-[90px] resize-y"
              />

              {error && <div className="mt-3 rounded-lg border border-error-500/20 bg-error-500/10 px-3 py-2 text-sm text-error-300">{error}</div>}

              <div className="mt-4 flex justify-end">
                <button onClick={() => void generate()} disabled={loading || !topic.trim()} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {loading ? t('study.generating') : t('study.generate', { label: selected.label })}
                </button>
              </div>
            </div>

            {result && (
              <div className="glass-panel rounded-2xl p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-white font-semibold"><Trophy size={17} className="text-emerald-300" /> {t('study.result')}</div>
                  <button onClick={() => void generate()} disabled={loading} className="btn-ghost text-xs inline-flex items-center gap-1.5"><RefreshCw size={13} /> {t('study.regenerate')}</button>
                </div>
                <div className="prose prose-invert max-w-none whitespace-pre-wrap text-sm leading-7 text-ink-100">{result}</div>
                {mode === 'quiz' && <div className="mt-5 flex items-center gap-2 rounded-lg bg-emerald-500/5 border border-emerald-400/10 px-3 py-2 text-xs text-emerald-200"><CheckCircle2 size={14} /> {t('study.quizHint')}</div>}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
