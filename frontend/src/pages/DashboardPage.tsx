import { useEffect, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { useTranslation } from '@/i18n/I18nContext';
import { AgentAvatar } from '@/components/AgentAvatar';
import { analyticsService, documentService } from '@/services/api';
import type { DocumentItem } from '@/types';
import {
  MessageSquare, FileText, Clock, TrendingUp,
  Plus, ArrowRight, Pin,
} from 'lucide-react';

export function DashboardPage() {
  const { conversations, navigate, createConversation, setActiveAgentId, setActiveConversation, user, agents, getAgent } = useApp();
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [messageCount, setMessageCount] = useState<number | null>(null);
  const [documentsLoading, setDocumentsLoading] = useState(true);

  const activeConvs = conversations.filter((c) => !c.archived);
  const pinnedConvs = conversations.filter((c) => c.pinned);
  const localMessageCount = conversations.reduce((sum, c) => sum + c.messages.length, 0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setDocumentsLoading(true);
      try {
        const [docs, analytics] = await Promise.all([documentService.list(), analyticsService.overview()]);
        if (!cancelled) {
          setDocuments(docs);
          setMessageCount(analytics.totals.messages);
        }
      } catch {
        if (!cancelled) {
          setDocuments([]);
          setMessageCount(null);
        }
      } finally {
        if (!cancelled) setDocumentsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const totalMessages = messageCount ?? localMessageCount;

  const stats = [
    {
      label: t('dashboard.stats.conversations'),
      value: activeConvs.length,
      icon: <MessageSquare size={20} />,
      color: 'from-primary-500/20 to-primary-600/5',
      iconColor: 'text-primary-400',
    },
    {
      label: t('dashboard.stats.messages'),
      value: totalMessages,
      icon: <TrendingUp size={20} />,
      color: 'from-accent-500/20 to-accent-600/5',
      iconColor: 'text-accent-400',
    },
    {
      label: t('dashboard.stats.documents'),
      value: documents.length,
      icon: <FileText size={20} />,
      color: 'from-success-500/20 to-success-600/5',
      iconColor: 'text-success-400',
    },
    {
      label: t('dashboard.stats.pinned'),
      value: pinnedConvs.length,
      icon: <Pin size={20} />,
      color: 'from-warning-500/20 to-warning-600/5',
      iconColor: 'text-warning-400',
    },
  ];

  const recentConvs = [...activeConvs]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const timeAgo = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const hrs = diff / 3600_000;
    if (hrs < 1) return t('dashboard.timeAgo.justNow');
    if (hrs < 24) return t('dashboard.timeAgo.hoursAgo', { count: Math.floor(hrs) });
    const days = Math.floor(hrs / 24);
    if (days === 1) return t('dashboard.timeAgo.oneDayAgo');
    if (days < 7) return t('dashboard.timeAgo.daysAgo', { count: days });
    return t('dashboard.timeAgo.weeksAgo', { count: Math.floor(days / 7) });
  };

  return (
    <div className="flex-1 overflow-y-auto app-bg">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-2xl font-bold text-white mb-1">
            {t('dashboard.welcomeBack', { name: user?.name?.split(' ')[0] || t('sidebar.defaultUserName') })}
          </h1>
          <p className="text-ink-400">{t('dashboard.subtitle')}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => (
            <div
              key={i}
              className={`glass rounded-2xl p-5 bg-gradient-to-br ${stat.color} animate-fade-in-up`}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className={`mb-3 ${stat.iconColor}`}>{stat.icon}</div>
              <p className="text-3xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-ink-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Quick start with agents */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">{t('dashboard.quickStart')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {agents.map((agent, i) => (
              <button
                key={agent.id}
                onClick={() => {
                  setActiveAgentId(agent.id);
                  createConversation(agent.id);
                  navigate('chat');
                }}
                className="glass rounded-2xl p-4 text-center glass-hover animate-fade-in-up"
                style={{ animationDelay: `${0.15 + i * 0.05}s` }}
              >
                <div className="flex justify-center mb-3">
                  <AgentAvatar agent={agent} size="md" />
                </div>
                <p className="text-sm font-medium text-white">{agent.shortName}</p>
                <p className="text-xs text-ink-400 mt-0.5 line-clamp-2">{agent.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent conversations */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">{t('dashboard.recentConversations')}</h2>
              <button
                onClick={() => navigate('chat')}
                className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
              >
                {t('dashboard.viewAll')} <ArrowRight size={14} />
              </button>
            </div>
            <div className="space-y-2">
              {recentConvs.map((conv, i) => {
                const agent = getAgent(conv.agentId);
                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setActiveConversation(conv.id);
                      navigate('chat');
                    }}
                    className="w-full glass rounded-xl p-4 flex items-center gap-4 glass-hover text-left animate-fade-in-up"
                    style={{ animationDelay: `${0.3 + i * 0.05}s` }}
                  >
                    <AgentAvatar agent={agent} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{conv.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-ink-500">{agent.shortName}</span>
                        {conv.pinned && <Pin size={10} className="text-ink-500" />}
                      </div>
                    </div>
                    <span className="text-xs text-ink-500 flex items-center gap-1 shrink-0">
                      <Clock size={12} />
                      {timeAgo(conv.updatedAt)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Documents preview */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">{t('dashboard.documentsHeading')}</h2>
              <button
                onClick={() => navigate('documents')}
                className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
              >
                {t('dashboard.viewAllShort')} <ArrowRight size={14} />
              </button>
            </div>
            <div className="space-y-2">
              {documentsLoading ? (
                <div className="glass rounded-xl p-4 text-sm text-ink-400">{t('dashboard.loadingDocuments')}</div>
              ) : documents.slice(0, 4).map((doc, i) => (
                <div
                  key={doc.id}
                  className="glass rounded-xl p-3 flex items-center gap-3 animate-fade-in-up"
                  style={{ animationDelay: `${0.35 + i * 0.05}s` }}
                >
                  <div className="w-9 h-9 rounded-lg glass-subtle flex items-center justify-center text-xs font-mono text-ink-300 uppercase shrink-0">
                    {doc.type}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{doc.name}</p>
                    <p className="text-xs text-ink-500">{doc.size}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    doc.status === 'ready' ? 'bg-success-400' :
                    doc.status === 'processing' ? 'bg-warning-400 animate-pulse-soft' :
                    'bg-error-400'
                  }`} />
                </div>
              ))}
              {!documentsLoading && documents.length === 0 && (
                <div className="glass rounded-xl p-4 text-sm text-ink-500">{t('dashboard.noDocumentsYet')}</div>
              )}
            </div>

            <button
              onClick={() => navigate('documents')}
              className="mt-3 w-full glass rounded-xl p-3 flex items-center justify-center gap-2 text-sm text-ink-300 glass-hover"
            >
              <Plus size={16} />
              {t('dashboard.uploadDocument')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
