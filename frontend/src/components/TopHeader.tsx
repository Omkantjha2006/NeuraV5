import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/store/AppContext';
import { useTranslation } from '@/i18n/I18nContext';
import { AgentAvatar } from '@/components/AgentAvatar';
import { Dropdown } from '@/components/Dropdown';
import {
  Menu, Check, ChevronDown, LogOut, User, Settings,
  LayoutDashboard, FileText, Sparkles,
} from 'lucide-react';
import type { AgentId } from '@/types';

export function TopHeader() {
  const {
    activeConversation, activeAgentId, setActiveAgentId, agents, getAgent,
    toggleSidebar, sidebarOpen, navigate, logout, user,
  } = useApp();
  const { t } = useTranslation();

  const [selectorOpen, setSelectorOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectorOpen) return;
    const handler = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [selectorOpen]);

  const currentAgent = getAgent(activeAgentId);

  const profileMenuItems = [
    { label: t('topHeader.menu.profile'), icon: <User size={14} />, onClick: () => navigate('profile') },
    { label: t('topHeader.menu.settings'), icon: <Settings size={14} />, onClick: () => navigate('settings') },
    { label: t('topHeader.menu.dashboard'), icon: <LayoutDashboard size={14} />, onClick: () => navigate('dashboard') },
    { label: t('topHeader.menu.documents'), icon: <FileText size={14} />, onClick: () => navigate('documents') },
    { label: t('topHeader.menu.signOut'), icon: <LogOut size={14} />, onClick: logout, danger: true },
  ];

  return (
    <header className="min-h-16 shrink-0 glass border-b border-white/10 flex items-center justify-between px-4 gap-4 relative z-20 safe-top">
      {/* Left: sidebar toggle + title */}
      <div className="flex items-center gap-3 min-w-0">
        {!sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg text-ink-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Menu size={18} />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-white truncate">
            {activeConversation?.title || t('topHeader.newConversation')}
          </h1>
        </div>
      </div>

      {/* Center: Agent selector */}
      <div className="relative" ref={selectorRef}>
        <button
          onClick={() => setSelectorOpen((o) => !o)}
          className="flex items-center gap-2.5 glass rounded-xl px-3 py-2 hover:bg-white/10 transition-all"
        >
          <AgentAvatar agent={currentAgent} size="sm" active />
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium text-white leading-none">{currentAgent.name}</p>
            <p className="text-xs text-ink-400 mt-0.5">{currentAgent.description}</p>
          </div>
          <ChevronDown size={16} className={`text-ink-400 transition-transform ${selectorOpen ? 'rotate-180' : ''}`} />
        </button>

        {selectorOpen && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 glass-overlay rounded-2xl shadow-2xl p-3 animate-scale-in z-30">
            <p className="text-xs font-medium text-ink-400 uppercase tracking-wider px-2 mb-2">{t('topHeader.selectAgent')}</p>
            <div className="space-y-1">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => {
                    setActiveAgentId(agent.id as AgentId);
                    setSelectorOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 rounded-xl p-2.5 transition-all ${
                    activeAgentId === agent.id ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                >
                  <AgentAvatar agent={agent} size="md" active={activeAgentId === agent.id} />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-white">{agent.name}</p>
                    <p className="text-xs text-ink-400">{agent.description}</p>
                  </div>
                  {activeAgentId === agent.id && (
                    <Check size={16} className="text-primary-400" />
                  )}
                </button>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-white/5 px-2">
              <p className="text-xs text-ink-500 flex items-center gap-1.5">
                <Sparkles size={12} />
                {t('topHeader.capabilitiesAvailable', { count: currentAgent.capabilities.length })}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right: Profile menu */}
      <div className="flex items-center gap-2">
        <Dropdown
          trigger={({ toggle }) => (
            <button
              onClick={toggle}
              className="flex items-center gap-2 glass rounded-xl pl-2 pr-3 py-1.5 hover:bg-white/10 transition-all"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-xs font-semibold">
                {user?.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <span className="text-sm text-white hidden sm:block">{user?.name?.split(' ')[0] || t('sidebar.defaultUserName')}</span>
              <ChevronDown size={14} className="text-ink-400" />
            </button>
          )}
          items={profileMenuItems}
        />
      </div>
    </header>
  );
}
