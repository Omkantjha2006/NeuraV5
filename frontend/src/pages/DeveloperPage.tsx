import { useEffect, useState } from 'react';
import { Code2, Github, Play, Bug, Wand2, Loader2, AlertTriangle } from 'lucide-react';
import { developerService } from '@/services/api';
import { useTranslation } from '@/i18n/I18nContext';

type Tab = 'explain' | 'github' | 'execute';

export function DeveloperPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('explain');
  const [code, setCode] = useState('function add(a, b) {\n  return a + b;\n}');
  const [language, setLanguage] = useState('javascript');
  const [task, setTask] = useState('Explain this code and suggest any improvements.');
  const [repo, setRepo] = useState('');
  const [question, setQuestion] = useState('Review the architecture and identify important issues.');
  const [result, setResult] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [executionStatus, setExecutionStatus] = useState<{ available: boolean; reason: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    developerService.status()
      .then((s) => { if (!cancelled) setExecutionStatus(s); })
      .catch(() => { if (!cancelled) setExecutionStatus({ available: false, reason: t('developer.executeWarning') }); });
    return () => { cancelled = true; };
  }, [t]);

  const run = async () => {
    setLoading(true); setError(''); setResult(''); setOutput('');
    try {
      if (tab === 'explain') {
        const r = await developerService.explain(code, language, task);
        setResult(r.result);
      } else if (tab === 'github') {
        const r = await developerService.analyzeRepository(repo, question);
        setResult(r.analysis);
      } else {
        const r = await developerService.execute(code, language === 'python' ? 'python' : 'javascript');
        setOutput([r.stdout && `STDOUT\n${r.stdout}`, r.stderr && `STDERR\n${r.stderr}`].filter(Boolean).join('\n\n') || t('developer.noOutput'));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('developer.genericError'));
    } finally { setLoading(false); }
  };

  const tabs = [
    ['explain', t('developer.tabs.explain'), Bug],
    ['github', t('developer.tabs.github'), Github],
    ['execute', t('developer.tabs.execute'), Play],
  ] as const;

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2 text-primary-300 text-sm font-medium"><Code2 size={16}/> {t('developer.badge')}</div>
          <h1 className="text-2xl font-bold text-white">{t('developer.title')}</h1>
          <p className="mt-1 text-sm text-ink-400">{t('developer.subtitle')}</p>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {tabs.map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm ${tab === id ? 'bg-primary-500/15 border border-primary-400/30 text-primary-200' : 'glass-subtle text-ink-300'}`}>
              <Icon size={16}/>{label}
            </button>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="glass-panel rounded-2xl p-5">
            {tab === 'github' ? (
              <>
                <label className="text-sm text-ink-300">{t('developer.githubRepoLabel')}</label>
                <input value={repo} onChange={e=>setRepo(e.target.value)} placeholder={t('developer.githubRepoPlaceholder')} className="mt-2 w-full glass-subtle rounded-xl px-3 py-2.5 text-sm text-white"/>
                <label className="mt-4 block text-sm text-ink-300">{t('developer.analysisRequestLabel')}</label>
                <textarea value={question} onChange={e=>setQuestion(e.target.value)} rows={4} className="mt-2 w-full glass-subtle rounded-xl p-3 text-sm text-white"/>
              </>
            ) : (
              <>
                <div className="flex gap-2 mb-3">
                  <select value={language} onChange={e=>setLanguage(e.target.value)} className="glass-subtle rounded-xl px-3 py-2 text-sm text-white">
                    <option value="javascript">{t('developer.languages.javascript')}</option><option value="python">{t('developer.languages.python')}</option><option value="typescript">{t('developer.languages.typescript')}</option>
                  </select>
                  {tab === 'explain' && <input value={task} onChange={e=>setTask(e.target.value)} className="flex-1 glass-subtle rounded-xl px-3 py-2 text-sm text-white"/>}
                </div>
                <textarea value={code} onChange={e=>setCode(e.target.value)} rows={18} spellCheck={false} className="w-full rounded-xl bg-black/30 border border-white/10 p-4 font-mono text-sm text-white focus:outline-none"/>
              </>
            )}
            {tab === 'execute' && executionStatus && !executionStatus.available && (
              <div className="mt-3 flex items-start gap-2 text-xs text-amber-300">
                <AlertTriangle size={15} className="mt-0.5 shrink-0"/>
                {executionStatus.reason || t('developer.executeWarning')}
              </div>
            )}
            <button
              onClick={run}
              disabled={loading || (tab === 'github' ? !repo.trim() : !code.trim()) || (tab === 'execute' && executionStatus?.available === false)}
              className="btn-primary mt-4"
            >
              {loading ? <Loader2 size={16} className="animate-spin"/> : <Wand2 size={16}/>}
              {loading ? t('developer.working') : tab === 'github' ? t('developer.analyzeRepository') : tab === 'execute' ? t('developer.runCode') : t('developer.analyzeCode')}
            </button>
          </section>

          <section className="glass-panel rounded-2xl p-5 min-h-[480px]">
            <h2 className="mb-3 text-sm font-semibold text-white">{t('developer.resultHeading')}</h2>
            {error && <div className="mb-3 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-300">{error}</div>}
            {output && <pre className="whitespace-pre-wrap rounded-xl bg-black/30 p-4 font-mono text-sm text-ink-200">{output}</pre>}
            {!output && !result && !error && <div className="text-sm text-ink-500">{t('developer.resultPlaceholder')}</div>}
            {result && <div className="whitespace-pre-wrap text-sm leading-7 text-ink-200">{result}</div>}
          </section>
        </div>
      </div>
    </main>
  );
}
