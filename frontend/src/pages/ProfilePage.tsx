import { useEffect, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { useTranslation } from '@/i18n/I18nContext';
import { AgentAvatar } from '@/components/AgentAvatar';
import { analyticsService } from '@/services/api';
import type { Agent } from '@/types';
import {
  Mail, Calendar, Zap, MessageSquare, FileText,
  Edit3, Crown, Check,
} from 'lucide-react';

export function ProfilePage() {
  const { user, navigate, agents } = useApp();
  const { t, td, language } = useTranslation();
  const [analytics, setAnalytics] = useState<{ totals: Record<string, number>; mostUsedAgents: Array<{ agentId: string; conversations: number }> } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void analyticsService.overview().then((data) => {
      if (!cancelled) setAnalytics(data);
    }).catch(() => {
      if (!cancelled) setAnalytics(null);
    });
    return () => { cancelled = true; };
  }, []);

  const totalMessages = analytics?.totals.messages ?? 0;
  const agentUsage = agents.map((agent: Agent) => ({
    agent,
    count: analytics?.mostUsedAgents.find((item) => item.agentId === agent.id)?.conversations ?? 0,
  })).sort((a, b) => b.count - a.count);

  const maxUsage = Math.max(...agentUsage.map((u) => u.count), 1);
  const totalConversations = analytics?.totals.conversations ?? 0;
  const totalDocuments = analytics?.totals.documents ?? 0;
  const planFeatures = td<string[]>('profile.planFeatures');

  return (
    <div className="flex-1 overflow-y-auto app-bg">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Profile header */}
        <div className="glass-strong rounded-2xl p-6 mb-6 animate-fade-in-up">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-2xl font-semibold">
                {user?.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-success-500/20 border-2 border-ink-900 flex items-center justify-center">
                <Check size={12} className="text-success-400" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-white">{user?.name}</h1>
                <span className="inline-flex items-center gap-1 glass-subtle rounded-full px-2.5 py-0.5 text-xs font-medium text-warning-300">
                  <Crown size={11} />
                  {user?.plan}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-ink-400">
                <span className="flex items-center gap-1.5">
                  <Mail size={14} />
                  {user?.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  {t('profile.joined', { date: user?.createdAt ? new Date(user.createdAt).toLocaleDateString(language, { month: 'short', year: 'numeric' }) : '—' })}
                </span>
              </div>
            </div>

            <button onClick={() => navigate('settings')} className="btn-glass shrink-0">
              <Edit3 size={15} />
              {t('profile.editProfile')}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: t('profile.stats.conversations'), value: totalConversations, icon: <MessageSquare size={18} />, color: 'text-primary-400' },
            { label: t('profile.stats.messages'), value: totalMessages, icon: <Zap size={18} />, color: 'text-accent-400' },
            { label: t('profile.stats.documents'), value: totalDocuments, icon: <FileText size={18} />, color: 'text-success-400' },
          ].map((stat, i) => (
            <div
              key={i}
              className="glass rounded-2xl p-5 text-center animate-fade-in-up"
              style={{ animationDelay: `${0.05 + i * 0.05}s` }}
            >
              <div className={`flex justify-center mb-2 ${stat.color}`}>{stat.icon}</div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-ink-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Agent usage */}
          <div className="glass rounded-2xl p-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-lg font-semibold text-white mb-4">{t('profile.agentUsage')}</h2>
            <div className="space-y-3">
              {agentUsage.map((u) => (
                <div key={u.agent.id} className="flex items-center gap-3">
                  <AgentAvatar agent={u.agent} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white">{u.agent.shortName}</span>
                      <span className="text-xs text-ink-500">{t('profile.chats', { count: u.count })}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${u.agent.gradient}`}
                        style={{ width: `${(u.count / maxUsage) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Plan */}
          <div className="glass rounded-2xl p-6 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">{t('profile.currentPlan')}</h2>
              <span className="inline-flex items-center gap-1 glass-subtle rounded-full px-2.5 py-0.5 text-xs font-medium text-warning-300">
                <Crown size={11} />
                {user?.plan}
              </span>
            </div>
            <div className="space-y-2 mb-5">
              {planFeatures.map((feat) => (
                <div key={feat} className="flex items-center gap-2 text-sm text-ink-300">
                  <Check size={14} className="text-success-400" />
                  {feat}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
