import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AgentId, Conversation, Message, Route, User } from '@/types';
import { MOCK_CONVERSATIONS, createMessage } from '@/data/mockData';
import { conversationService, authService, agentService } from '@/services/api';
import { DEFAULT_AGENTS } from '@/data/agents';
import { appEnv } from '@/config/env';
import { useTranslation } from '@/i18n/I18nContext';
import type { Agent } from '@/types';

interface AppState {
  route: Route;
  navigate: (route: Route) => void;

  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  logout: () => void;

  conversations: Conversation[];
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  setActiveConversation: (id: string | null) => void;
  createConversation: (agentId: AgentId, title?: string) => Conversation;
  updateConversation: (conv: Conversation) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  togglePin: (id: string) => void;
  toggleArchive: (id: string) => void;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  setMessageFeedback: (messageId: string, feedback: 'positive' | 'negative' | null) => Promise<void>;

  agents: Agent[];
  agentsLoading: boolean;
  getAgent: (id: AgentId) => Agent;
  activeAgentId: AgentId;
  setActiveAgentId: (id: AgentId) => void;

  messages: Message[];
  isGenerating: boolean;
  sendMessage: (content: string, options?: { webResearch?: boolean; webOptions?: Record<string, unknown> }) => void;
  stopGeneration: () => void;
  regenerateLast: () => void;

  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [route, setRoute] = useState<Route>(() => {
    const path = window.location.pathname.replace(/^\//, '');
    if (path === 'reset-password') return 'reset-password';
    if (path === 'forgot-password') return 'forgot-password';
    if (path === 'signin') return 'login';
    if (path === 'signup') return 'register';
    return 'landing';
  });
  const [user, setUserState] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>(DEFAULT_AGENTS);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [activeAgentId, setActiveAgentId] = useState<AgentId>('general');
  const [isGenerating, setIsGenerating] = useState(false);
  // On phones/small tablets the sidebar renders as a full-screen overlay
  // drawer (see Sidebar.tsx), so it should start closed there — only
  // desktop-width screens (lg breakpoint, 1024px+) get it open by default.
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth >= 1024
  );
  const stopFlag = useRef(false);
  const streamControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadAgents = async () => {
      try {
        const catalog = await agentService.getAgents();
        if (!cancelled && catalog.length > 0) {
          setAgents(catalog);
          setActiveAgentId((current) => catalog.some((agent) => agent.id === current) ? current : catalog[0].id);
        }
      } catch {
        // Keep the development fallback catalog when the API is unavailable.
      } finally {
        if (!cancelled) setAgentsLoading(false);
      }
    };

    void loadAgents();

    const restoreSession = async () => {
      const existingUser = await authService.me();
      if (cancelled || !existingUser) return;

      setUserState(existingUser);
      try {
        setConversations(await conversationService.list());
      } catch {
        setConversations([]);
      }
      setRoute('chat');
    };

    void restoreSession();
    return () => { cancelled = true; };
  }, []);

  const navigate = useCallback((r: Route) => {
    setRoute(r);
    // Close the drawer after any navigation on phone/tablet widths, so
    // picking a page or conversation doesn't leave the overlay covering
    // the content the user just asked to see.
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
    const browserPath = r === 'landing' ? '/' : r === 'login' ? '/signin' : r === 'register' ? '/signup' : `/${r}`;
    const path = browserPath;
    const search = r === 'reset-password' ? window.location.search : '';
    if (window.location.pathname !== path || window.location.search !== search) window.history.pushState({ route: r }, '', `${path}${search}`);
  }, []);

  const setUser = useCallback((u: User | null) => setUserState(u), []);

  const login = useCallback(async (email: string, password: string) => {
    const { user: u, error } = await authService.login(email, password);
    if (error) return { error };
    setUserState(u);
    try {
      setConversations(await conversationService.list());
    } catch {
      setConversations([]);
    }
    return {};
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { user: u, error } = await authService.register(name, email, password);
    if (error) return { error };
    setUserState(u);
    try {
      setConversations(await conversationService.list());
    } catch {
      setConversations([]);
    }
    return {};
  }, []);

  const logout = useCallback(() => {
    void authService.logout();
    setUserState(null);
    setRoute('landing');
  }, []);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId]
  );

  const getAgent = useCallback((id: AgentId): Agent => {
    return agents.find((agent) => agent.id === id) ?? agents[0] ?? DEFAULT_AGENTS[0];
  }, [agents]);

  const setActiveConversation = useCallback((id: string | null) => {
    setActiveConversationId(id);
    const conv = conversations.find((c) => c.id === id);
    if (conv) setActiveAgentId(conv.agentId);
  }, [conversations]);

  const createConversation = useCallback((agentId: AgentId, title?: string): Conversation => {
    const conv: Conversation = {
      id: `conv-${Date.now()}`,
      title: title || 'New Conversation',
      agentId,
      messages: [],
      pinned: false,
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveConversationId(conv.id);
    setActiveAgentId(agentId);
    return conv;
  }, []);

  const updateConversation = useCallback((conv: Conversation) => {
    setConversations((prev) => prev.map((c) => (c.id === conv.id ? conv : c)));
  }, []);

  const deleteConversation = useCallback((id: string) => {
    const local = conversations.find((c) => c.id === id);
    if (!local) return;
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) setActiveConversationId(null);
    if (!id.startsWith('conv-')) void conversationService.delete(id).catch(() => {
      setConversations((prev) => [local, ...prev]);
    });
  }, [activeConversationId, conversations]);

  const renameConversation = useCallback((id: string, title: string) => {
    setConversations((prev) => prev.map((c) => c.id === id ? { ...c, title, updatedAt: new Date().toISOString() } : c));
    if (!id.startsWith('conv-')) void conversationService.update({ ...(conversations.find((c) => c.id === id) as Conversation), title }).catch(() => undefined);
  }, [conversations]);

  const togglePin = useCallback((id: string) => {
    const current = conversations.find((c) => c.id === id);
    if (!current) return;
    const next = !current.pinned;
    setConversations((prev) => prev.map((c) => c.id === id ? { ...c, pinned: next } : c));
    if (!id.startsWith('conv-')) void conversationService.update({ ...current, pinned: next }).catch(() => undefined);
  }, [conversations]);

  const toggleArchive = useCallback((id: string) => {
    const current = conversations.find((c) => c.id === id);
    if (!current) return;
    const next = !current.archived;
    setConversations((prev) => prev.map((c) => c.id === id ? { ...c, archived: next } : c));
    if (!id.startsWith('conv-')) void conversationService.update({ ...current, archived: next }).catch(() => undefined);
  }, [conversations]);

  const updateMessageInConversation = useCallback((convId: string, msgId: string, updater: (m: Message) => Message) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? { ...c, messages: c.messages.map((m) => (m.id === msgId ? updater(m) : m)), updatedAt: new Date().toISOString() }
          : c
      )
    );
  }, []);

  const refreshConversations = useCallback(async (preferredId?: string) => {
    if (appEnv.useMockData || !appEnv.apiUrl) return;
    try {
      const fresh = await conversationService.list();
      setConversations(fresh);
      if (preferredId) setActiveConversationId(preferredId);
    } catch {
      // Keep the optimistic state if the refresh fails.
    }
  }, []);

  const editMessage = useCallback(async (messageId: string, content: string) => {
    if (!activeConversation || activeConversation.id.startsWith('conv-') || isGenerating) return;
    const updated = await conversationService.editMessage(activeConversation.id, messageId, content);
    setConversations((prev) => prev.map((c) => c.id === updated.id ? updated : c));

    const convId = updated.id;
    const aiMsgId = `msg-${Date.now()}-edit`;
    setConversations((prev) => prev.map((c) => c.id === convId ? {
      ...c,
      messages: [...c.messages, { id: aiMsgId, role: 'assistant', content: '', createdAt: new Date().toISOString(), agentId: c.agentId, isStreaming: true }],
    } : c));

    setIsGenerating(true);
    stopFlag.current = false;
    const controller = new AbortController();
    streamControllerRef.current = controller;

    try {
      let accumulated = '';
      for await (const chunk of conversationService.regenerateStream(convId, controller.signal)) {
        if (stopFlag.current) break;
        accumulated += chunk;
        updateMessageInConversation(convId, aiMsgId, (m) => ({ ...m, content: accumulated }));
      }
      updateMessageInConversation(convId, aiMsgId, (m) => ({ ...m, content: accumulated, isStreaming: false, isError: false }));
      await refreshConversations(convId);
    } catch (error) {
      if (!stopFlag.current && !controller.signal.aborted) {
        updateMessageInConversation(convId, aiMsgId, (m) => ({ ...m, content: error instanceof Error ? error.message : t('chat.regenerationFailed'), isStreaming: false, isError: true }));
      }
    } finally {
      if (streamControllerRef.current === controller) streamControllerRef.current = null;
      setIsGenerating(false);
    }
  }, [activeConversation, isGenerating, refreshConversations, updateMessageInConversation]);

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!activeConversation || activeConversation.id.startsWith('conv-')) return;
    await conversationService.deleteMessage(activeConversation.id, messageId);
    setConversations((prev) => prev.map((c) => c.id === activeConversation.id ? { ...c, messages: c.messages.filter((m) => m.id !== messageId), updatedAt: new Date().toISOString() } : c));
  }, [activeConversation]);

  const setMessageFeedback = useCallback(async (messageId: string, feedback: 'positive' | 'negative' | null) => {
    if (!activeConversation || activeConversation.id.startsWith('conv-')) return;
    await conversationService.setFeedback(activeConversation.id, messageId, feedback);
    setConversations((prev) => prev.map((c) => c.id === activeConversation.id ? {
      ...c, messages: c.messages.map((m) => m.id === messageId ? { ...m, feedback, liked: feedback === 'positive' ? true : feedback === 'negative' ? false : null } : m),
    } : c));
  }, [activeConversation]);

  const messages = useMemo(() => {
    if (!activeConversation) return [];
    return activeConversation.messages;
  }, [activeConversation]);

  const appendToConversation = useCallback((convId: string, msg: Message) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? { ...c, messages: [...c.messages, msg], updatedAt: new Date().toISOString() }
          : c
      )
    );
  }, []);

  const sendMessage = useCallback(async (content: string, options?: { webResearch?: boolean; webOptions?: Record<string, unknown> }) => {
    if (!content.trim() || isGenerating) return;

    let convId = activeConversationId ?? '';
    let conv = activeConversation;

    // New conversations created by the UI use a temporary local id. Persist them
    // before starting the real Phase 7 streaming request.
    if (!conv || conv.id.startsWith('conv-')) {
      const title = conv?.title && conv.title !== 'New Conversation'
        ? conv.title
        : content.slice(0, 40);

      const serverConversation = await conversationService.create(activeAgentId, title);
      if (conv) {
        setConversations((prev) => prev.map((item) => item.id === conv!.id ? serverConversation : item));
      } else {
        setConversations((prev) => [serverConversation, ...prev]);
      }
      conv = serverConversation;
      convId = serverConversation.id;
      setActiveConversationId(serverConversation.id);
      setActiveAgentId(serverConversation.agentId);
    }

    const userMsg = createMessage('user', content, activeAgentId);
    appendToConversation(convId, userMsg);

    if (conv.title === 'New Conversation') {
      renameConversation(convId, content.slice(0, 40));
    }

    const aiMsgId = `msg-${Date.now()}-ai`;
    const aiPlaceholder: Message = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      agentId: activeAgentId,
      isStreaming: true,
    };
    appendToConversation(convId, aiPlaceholder);

    setIsGenerating(true);
    stopFlag.current = false;
    const controller = new AbortController();
    streamControllerRef.current = controller;

    try {
      let accumulated = '';
      for await (const chunk of conversationService.streamResponse(
        convId,
        content,
        activeAgentId,
        controller.signal,
        options,
      )) {
        if (stopFlag.current) break;
        accumulated += chunk;
        updateMessageInConversation(convId, aiMsgId, (m) => ({ ...m, content: accumulated }));
      }

      updateMessageInConversation(convId, aiMsgId, (m) => ({
        ...m,
        content: accumulated,
        isStreaming: false,
        isError: false,
      }));
      await refreshConversations(convId);
    } catch (error) {
      if (stopFlag.current || controller.signal.aborted) {
        updateMessageInConversation(convId, aiMsgId, (m) => ({
          ...m,
          isStreaming: false,
        }));
      } else {
        updateMessageInConversation(convId, aiMsgId, (m) => ({
          ...m,
          content: error instanceof Error ? error.message : t('chat.sendFailed'),
          isError: true,
          isStreaming: false,
        }));
      }
    } finally {
      if (streamControllerRef.current === controller) streamControllerRef.current = null;
      setIsGenerating(false);
    }
  }, [
    activeConversationId,
    activeConversation,
    activeAgentId,
    isGenerating,
    appendToConversation,
    renameConversation,
    updateMessageInConversation,
    refreshConversations,
  ]);

  const stopGeneration = useCallback(() => {
    stopFlag.current = true;
    streamControllerRef.current?.abort();
    setIsGenerating(false);
  }, []);

  const regenerateLast = useCallback(async () => {
    if (!activeConversation || activeConversation.id.startsWith('conv-') || isGenerating) return;

    const lastAssistant = [...activeConversation.messages].reverse().find((m) => m.role === 'assistant');
    const lastUser = [...activeConversation.messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;

    const convId = activeConversation.id;
    if (lastAssistant) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? { ...c, messages: c.messages.filter((m) => m.id !== lastAssistant.id) }
            : c
        )
      );
    }

    const aiMsgId = `msg-${Date.now()}-regenerate`;
    appendToConversation(convId, {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      agentId: activeConversation.agentId,
      isStreaming: true,
    });

    setIsGenerating(true);
    stopFlag.current = false;
    const controller = new AbortController();
    streamControllerRef.current = controller;

    try {
      let accumulated = '';
      for await (const chunk of conversationService.regenerateStream(convId, controller.signal)) {
        if (stopFlag.current) break;
        accumulated += chunk;
        updateMessageInConversation(convId, aiMsgId, (m) => ({ ...m, content: accumulated }));
      }

      updateMessageInConversation(convId, aiMsgId, (m) => ({
        ...m,
        content: accumulated,
        isStreaming: false,
        isError: false,
      }));
      await refreshConversations(convId);
    } catch (error) {
      if (stopFlag.current || controller.signal.aborted) {
        updateMessageInConversation(convId, aiMsgId, (m) => ({ ...m, isStreaming: false }));
      } else {
        updateMessageInConversation(convId, aiMsgId, (m) => ({
          ...m,
          content: error instanceof Error ? error.message : t('chat.regenerationFailed'),
          isError: true,
          isStreaming: false,
        }));
      }
    } finally {
      if (streamControllerRef.current === controller) streamControllerRef.current = null;
      setIsGenerating(false);
    }
  }, [activeConversation, isGenerating, appendToConversation, updateMessageInConversation, refreshConversations]);

  const toggleSidebar = useCallback(() => setSidebarOpen((s) => !s), []);

  const value: AppState = {
    route,
    navigate,
    user,
    isAuthenticated: !!user,
    setUser,
    login,
    register,
    logout,
    conversations,
    activeConversationId,
    activeConversation,
    setActiveConversation,
    createConversation,
    updateConversation,
    deleteConversation,
    renameConversation,
    togglePin,
    toggleArchive,
    editMessage,
    deleteMessage,
    setMessageFeedback,
    agents,
    agentsLoading,
    getAgent,
    activeAgentId,
    setActiveAgentId,
    messages,
    isGenerating,
    sendMessage,
    stopGeneration,
    regenerateLast,
    sidebarOpen,
    toggleSidebar,
    setSidebarOpen,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
