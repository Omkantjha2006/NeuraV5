import { useState, useMemo } from 'react';
import { useApp } from '@/store/AppContext';
import { useTranslation } from '@/i18n/I18nContext';
import { NeuraLogo } from '@/components/NeuraLogo';
import { Dropdown, type MenuItem } from '@/components/Dropdown';
import {
  Search, Plus, MessageSquare, Pin, Archive, Trash2, Edit3,
  Settings, ChevronLeft, ChevronRight, MoreHorizontal, X,
  LayoutDashboard, FileText, User, GraduationCap, Code2, ListTodo, BarChart3,
} from 'lucide-react';
import type { Conversation, ConversationGroup } from '@/types';

function groupConversations(convs: Conversation[]): { group: ConversationGroup; items: Conversation[] }[] {
  const now = Date.now();
  const today = new Date(now).setHours(0, 0, 0, 0);
  const yesterday = today - 86400_000;
  const weekAgo = today - 7 * 86400_000;

  const pinned = convs.filter((c) => c.pinned && !c.archived);
  const active = convs.filter((c) => !c.pinned && !c.archived);
  const archived = convs.filter((c) => c.archived);

  const groups: { group: ConversationGroup; items: Conversation[] }[] = [];

  if (pinned.length) groups.push({ group: 'Pinned', items: pinned });

  const todayItems = active.filter((c) => new Date(c.updatedAt).getTime() >= today);
  const yesterdayItems = active.filter((c) => {
    const t = new Date(c.updatedAt).getTime();
    return t >= yesterday && t < today;
  });
  const weekItems = active.filter((c) => {
    const t = new Date(c.updatedAt).getTime();
    return t >= weekAgo && t < yesterday;
  });
  const olderItems = active.filter((c) => new Date(c.updatedAt).getTime() < weekAgo);

  if (todayItems.length) groups.push({ group: 'Today', items: todayItems });
  if (yesterdayItems.length) groups.push({ group: 'Yesterday', items: yesterdayItems });
  if (weekItems.length) groups.push({ group: 'Previous 7 Days', items: weekItems });
  if (olderItems.length) groups.push({ group: 'Older', items: olderItems });
  if (archived.length) groups.push({ group: 'Older', items: archived });

  return groups;
}

// The internal group identifiers above stay in English (they're keys used
// for grouping/dedup logic below); this maps them to translation keys.
const GROUP_LABEL_KEYS: Record<ConversationGroup, string> = {
  Pinned: 'sidebar.groupPinned',
  Today: 'sidebar.groupToday',
  Yesterday: 'sidebar.groupYesterday',
  'Previous 7 Days': 'sidebar.groupPrevious7Days',
  Older: 'sidebar.groupOlder',
};

export function Sidebar() {
  const {
    conversations, activeConversationId, setActiveConversation,
    createConversation, deleteConversation, renameConversation,
    togglePin, toggleArchive, activeAgentId, navigate, sidebarOpen, getAgent,
    setSidebarOpen, user,
  } = useApp();
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const filtered = useMemo(() => {
    let list = conversations;
    if (!showArchived) list = list.filter((c) => !c.archived);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.title.toLowerCase().includes(q));
    }
    return groupConversations(list);
  }, [conversations, search, showArchived]);

  const handleNewChat = () => {
    createConversation(activeAgentId);
  };

  const startRename = (conv: Conversation) => {
    setRenamingId(conv.id);
    setRenameValue(conv.title);
  };

  const confirmRename = () => {
    if (renamingId && renameValue.trim()) {
      renameConversation(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  const getConvMenuItems = (conv: Conversation): MenuItem[] => [
    {
      label: conv.pinned ? t('sidebar.unpin') : t('sidebar.pin'),
      icon: <Pin size={14} />,
      onClick: () => togglePin(conv.id),
    },
    {
      label: t('sidebar.rename'),
      icon: <Edit3 size={14} />,
      onClick: () => startRename(conv),
    },
    {
      label: conv.archived ? t('sidebar.unarchive') : t('sidebar.archive'),
      icon: <Archive size={14} />,
      onClick: () => toggleArchive(conv.id),
    },
    {
      label: t('sidebar.delete'),
      icon: <Trash2 size={14} />,
      onClick: () => deleteConversation(conv.id),
      danger: true,
    },
  ];

  const navItems = [
    { label: t('sidebar.nav.dashboard'), icon: <LayoutDashboard size={18} />, route: 'dashboard' as const },
    { label: t('sidebar.nav.documents'), icon: <FileText size={18} />, route: 'documents' as const },
    { label: t('sidebar.nav.study'), icon: <GraduationCap size={18} />, route: 'study' as const },
    { label: t('sidebar.nav.developer'), icon: <Code2 size={18} />, route: 'developer' as const },
    { label: t('sidebar.nav.productivity'), icon: <ListTodo size={18} />, route: 'productivity' as const },
    { label: t('sidebar.nav.analytics'), icon: <BarChart3 size={18} />, route: 'analytics' as const },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:relative z-40 h-full transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'w-72' : 'w-0 lg:w-16'
        }`}
      >
        <div className={`h-full glass-panel border-r border-white/10 flex flex-col overflow-hidden safe-left safe-top safe-bottom ${sidebarOpen ? 'opacity-100' : 'opacity-0 lg:opacity-100'}`}>
          {/* Logo + collapse */}
          <div className="flex items-center justify-between px-4 h-16 border-b border-white/5 shrink-0">
            {sidebarOpen ? (
              <>
                <NeuraLogo size={26} />
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-ink-400 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
              </>
            ) : (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 mx-auto rounded-lg text-ink-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            )}
          </div>

          {sidebarOpen && (
            <>
              {/* New Chat */}
              <div className="p-3 shrink-0">
                <button onClick={handleNewChat} className="btn-primary w-full">
                  <Plus size={16} />
                  {t('sidebar.newChat')}
                </button>
              </div>

              {/* Search */}
              <div className="px-3 pb-3 shrink-0">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('sidebar.searchPlaceholder')}
                    className="w-full glass-subtle rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-ink-500 focus:outline-none focus:border-primary-400/30"
                  />
                </div>
              </div>

              {/* Nav links */}
              <div className="px-3 pb-2 shrink-0 space-y-0.5">
                {navItems.map((item) => (
                  <button
                    key={item.route}
                    onClick={() => navigate(item.route)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Conversation list */}
              <div className="flex-1 overflow-y-auto px-2 py-1">
                {filtered.length === 0 && (
                  <div className="text-center py-8 text-sm text-ink-500">
                    <MessageSquare size={24} className="mx-auto mb-2 opacity-50" />
                    {search ? t('sidebar.noConversationsFound') : t('sidebar.noConversationsYet')}
                  </div>
                )}

                {filtered.map(({ group, items }) => (
                  <div key={group} className="mb-3">
                    <div className="flex items-center justify-between px-3 py-1.5">
                      <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wider">{t(GROUP_LABEL_KEYS[group])}</span>
                      {group === 'Older' && items.some((c) => c.archived) && (
                        <button
                          onClick={() => setShowArchived(!showArchived)}
                          className="text-[11px] text-primary-400 hover:text-primary-300"
                        >
                          {showArchived ? t('sidebar.hideArchived') : t('sidebar.showArchived')}
                        </button>
                      )}
                    </div>

                    {items.map((conv) => {
                      const agent = getAgent(conv.agentId);
                      const isActive = conv.id === activeConversationId;
                      return (
                        <div
                          key={conv.id}
                          className={`group relative rounded-lg mx-1 my-0.5 transition-all ${
                            isActive ? 'bg-white/10 border border-white/10' : 'hover:bg-white/5'
                          }`}
                        >
                          {renamingId === conv.id ? (
                            <input
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onBlur={confirmRename}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') confirmRename();
                                if (e.key === 'Escape') setRenamingId(null);
                              }}
                              autoFocus
                              className="w-full bg-transparent px-3 py-2.5 text-sm text-white focus:outline-none"
                            />
                          ) : (
                            <button
                              onClick={() => {
                                setActiveConversation(conv.id);
                                navigate('chat');
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left"
                            >
                              <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: agent.color }}
                              />
                              <span className={`flex-1 text-sm truncate ${isActive ? 'text-white' : 'text-ink-300'}`}>
                                {conv.title}
                              </span>
                              {conv.pinned && <Pin size={12} className="text-ink-500 shrink-0" />}
                              {conv.archived && <Archive size={12} className="text-ink-500 shrink-0" />}
                            </button>
                          )}

                          {renamingId !== conv.id && (
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Dropdown
                                trigger={({ toggle }) => (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggle(); }}
                                    className="p-1 rounded-md text-ink-400 hover:bg-white/10 hover:text-white"
                                  >
                                    <MoreHorizontal size={16} />
                                  </button>
                                )}
                                items={getConvMenuItems(conv)}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* User profile + settings */}
              <div className="border-t border-white/5 p-3 shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate('profile')}
                    className="flex items-center gap-3 flex-1 min-w-0 hover:bg-white/5 rounded-lg p-1.5 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                      {user?.name?.[0]?.toUpperCase() || 'A'}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-sm font-medium text-white truncate">{user?.name || t('sidebar.defaultUserName')}</p>
                      <p className="text-xs text-ink-500 truncate">{user?.email}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => navigate('settings')}
                    className="p-2 rounded-lg text-ink-400 hover:bg-white/10 hover:text-white transition-colors shrink-0"
                  >
                    <Settings size={18} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
