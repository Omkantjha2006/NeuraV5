import { useEffect, useState } from 'react';
import { AlertCircle, Sparkles } from 'lucide-react';
import { shareService, type SharedMessage } from '@/services/api';

export function SharedMessagePage({ token }: { token: string }) {
  const [share, setShare] = useState<SharedMessage | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    shareService.get(token).then((result) => {
      if (!cancelled) setShare(result);
    }).catch((reason: unknown) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : 'This shared link is unavailable.');
    });
    return () => { cancelled = true; };
  }, [token]);

  return (
    <main className="min-h-screen app-bg flex items-center justify-center p-5">
      <article className="glass rounded-3xl w-full max-w-3xl p-6 sm:p-9">
        <div className="flex items-center gap-3 mb-7">
          <div className="w-10 h-10 rounded-xl bg-primary-500/15 text-primary-300 flex items-center justify-center"><Sparkles size={20} /></div>
          <div>
            <p className="text-white font-semibold">Neura shared response</p>
            <p className="text-sm text-ink-400">{share?.agentName || 'AI assistant'}{share?.conversationTitle ? ` · ${share.conversationTitle}` : ''}</p>
          </div>
        </div>
        {error ? (
          <div role="alert" className="flex items-center gap-2 text-red-300"><AlertCircle size={18} />{error}</div>
        ) : share ? (
          <>
            <div className="text-ink-100 whitespace-pre-wrap break-words leading-7">{share.content}</div>
            <p className="text-xs text-ink-500 mt-8">Shared {new Date(share.sharedAt).toLocaleString()}</p>
          </>
        ) : <p className="text-ink-400">Loading shared response…</p>}
      </article>
    </main>
  );
}
