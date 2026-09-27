import type { Agent, Conversation, DocumentItem, Message, Memory, User, UserSettings } from '@/types';
import { DEFAULT_AGENTS, getDefaultAgent } from '@/data/agents';
import { MOCK_CONVERSATIONS, MOCK_DOCUMENTS, MOCK_USER, createMessage } from '@/data/mockData';
import { appEnv } from '@/config/env';
import { apiFetch } from '@/services/http';

const useMock = () => appEnv.useMockData;

// In live mode a missing API URL must fail loudly instead of silently falling back to demo data.
const requireLiveApi = () => {
  if (!appEnv.apiUrl) throw new Error('VITE_API_URL is required when VITE_USE_MOCK_DATA=false.');
};

function toDocument(item: any): DocumentItem {
  const extension = item.name?.split('.').pop()?.toLowerCase();
  const typeMap: Record<string, DocumentItem['type']> = {
    pdf: 'pdf', docx: 'docx', doc: 'docx', txt: 'txt', md: 'md', csv: 'csv',
    png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image',
  };

  return {
    id: item.id,
    name: item.name,
    type: typeMap[extension ?? ''] ?? 'txt',
    size: formatSize(Number(item.sizeBytes ?? 0)),
    uploadedAt: item.createdAt,
    status: item.status,
    agentId: item.agentId ?? 'general',
    pages: item.pages ?? undefined,
  };
}

export const authService = {
  async me(): Promise<User | null> {
    if (useMock()) return null;
    try {
      const data = await apiFetch<{ user: User }>('/api/auth/me');
      return data.user;
    } catch {
      return null;
    }
  },

  async login(email: string, password: string): Promise<{ user: User; error?: string }> {
    if (useMock()) {
      await delay(400);
      if (!email.includes('@')) return { user: MOCK_USER, error: 'Invalid email format' };
      return { user: { ...MOCK_USER, email } };
    }
    try {
      requireLiveApi();
      const data = await apiFetch<{ user: User }>('/api/auth/login', {
        method: 'POST', body: JSON.stringify({ email, password }),
      });
      return { user: data.user };
    } catch (error) {
      return { user: MOCK_USER, error: getErrorMessage(error) };
    }
  },

  async register(name: string, email: string, password: string): Promise<{ user: User; error?: string }> {
    if (useMock()) {
      await delay(400);
      return { user: { ...MOCK_USER, name, email } };
    }
    try {
      requireLiveApi();
      const data = await apiFetch<{ user: User }>('/api/auth/register', {
        method: 'POST', body: JSON.stringify({ name, email, password }),
      });
      return { user: data.user };
    } catch (error) {
      return { user: MOCK_USER, error: getErrorMessage(error) };
    }
  },

  async forgotPassword(email: string): Promise<{ success: boolean; error?: string }> {
    if (useMock()) {
      await delay(300);
      return email.includes('@') ? { success: true } : { success: false, error: 'Enter a valid email address' };
    }
    try {
      requireLiveApi();
      return await apiFetch<{ success: boolean }>('/api/auth/forgot-password', {
        method: 'POST', body: JSON.stringify({ email }),
      });
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  },

  async googleAuth(): Promise<{ user: User; error?: string }> {
    if (useMock()) return { user: MOCK_USER };
    if (!appEnv.apiUrl) return { user: MOCK_USER, error: 'API URL is not configured.' };
    window.location.assign(`${appEnv.apiUrl}/api/auth/google`);
    return { user: MOCK_USER };
  },

  async logout(): Promise<void> {
    if (!useMock()) await apiFetch<void>('/api/auth/logout', { method: 'POST' });
  },
};

export const agentService = {
  async getAgents(): Promise<Agent[]> {
    if (useMock()) return DEFAULT_AGENTS;
    const data = await apiFetch<{ agents: Agent[] }>('/api/agents');
    return data.agents;
  },

  async getAgent(id: string): Promise<Agent> {
    if (useMock()) return getDefaultAgent(id as Agent['id']);
    const data = await apiFetch<{ agent: Agent }>(`/api/agents/${encodeURIComponent(id)}`);
    return data.agent;
  },
};

export const conversationService = {
  async list(): Promise<Conversation[]> {
    if (useMock()) return MOCK_CONVERSATIONS;
    const data = await apiFetch<{ conversations: Conversation[] }>('/api/conversations');
    return data.conversations;
  },

  async search(query: string): Promise<Conversation[]> {
    if (useMock()) {
      const q = query.trim().toLowerCase();
      if (!q) return MOCK_CONVERSATIONS;
      return MOCK_CONVERSATIONS.filter((c) =>
        c.title.toLowerCase().includes(q) || c.messages.some((m) => m.content.toLowerCase().includes(q)),
      );
    }
    const data = await apiFetch<{ conversations: Conversation[] }>(`/api/conversations/search?q=${encodeURIComponent(query)}`);
    return data.conversations;
  },

  async create(agentId: string, title?: string): Promise<Conversation> {
    if (useMock()) {
      return {
        id: `conv-${Date.now()}`,
        title: title || 'New Conversation',
        agentId: agentId as Conversation['agentId'], messages: [], pinned: false, archived: false,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
    }
    const data = await apiFetch<{ conversation: Conversation }>('/api/conversations', {
      method: 'POST', body: JSON.stringify({ agentId, title }),
    });
    return data.conversation;
  },

  async update(conversation: Conversation): Promise<Conversation> {
    if (useMock()) return { ...conversation, updatedAt: new Date().toISOString() };
    const data = await apiFetch<{ conversation: Conversation }>(`/api/conversations/${conversation.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: conversation.title, pinned: conversation.pinned,
        archived: conversation.archived, agentId: conversation.agentId,
      }),
    });
    return data.conversation;
  },

  async delete(id: string): Promise<void> {
    if (useMock()) return;
    await apiFetch<void>(`/api/conversations/${id}`, { method: 'DELETE' });
  },

  async editMessage(conversationId: string, messageId: string, content: string): Promise<Conversation> {
    if (useMock()) {
      const conversation = MOCK_CONVERSATIONS.find((c) => c.id === conversationId);
      if (!conversation) throw new Error('Conversation not found');
      return { ...conversation, messages: conversation.messages.map((m) => m.id === messageId ? { ...m, content } : m) };
    }
    const data = await apiFetch<{ conversation: Conversation }>(`/api/conversations/${conversationId}/messages/${messageId}`, {
      method: 'PATCH', body: JSON.stringify({ content }),
    });
    return data.conversation;
  },

  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    if (useMock()) return;
    await apiFetch<void>(`/api/conversations/${conversationId}/messages/${messageId}`, { method: 'DELETE' });
  },

  async setFeedback(conversationId: string, messageId: string, feedback: 'positive' | 'negative' | null): Promise<Message> {
    if (useMock()) {
      const message = MOCK_CONVERSATIONS.find((c) => c.id === conversationId)?.messages.find((m) => m.id === messageId);
      if (!message) throw new Error('Message not found');
      return { ...message, feedback };
    }
    const data = await apiFetch<{ message: Message }>(`/api/conversations/${conversationId}/messages/${messageId}/feedback`, {
      method: 'PATCH', body: JSON.stringify({ feedback }),
    });
    return data.message;
  },

  async sendMessage(conversationId: string, content: string, agentId: string): Promise<Message> {
    if (useMock()) return createMessage('user', content, agentId);
    const data = await apiFetch<{ message: Message }>(`/api/conversations/${conversationId}/messages`, {
      method: 'POST', body: JSON.stringify({ content, agentId }),
    });
    return data.message;
  },

  /**
   * Streams a real Gemini response from the Phase 7 SSE endpoint.
   * The server persists the user message and the completed/partial assistant message.
   */
  async *streamResponse(
    conversationId: string,
    content: string,
    agentId: string,
    signal?: AbortSignal,
    options?: { webResearch?: boolean; webOptions?: Record<string, unknown> },
  ): AsyncGenerator<string> {
    if (useMock()) {
      const responses: Record<string, string> = {
        general: 'Neura is running in frontend demo mode. Set VITE_USE_MOCK_DATA=false and configure GEMINI_API_KEY on the backend for live Gemini responses.',
        code: 'Neura Code is running in demo mode. Connect the Phase 7 backend to enable live Gemini responses.',
        study: 'Neura Study is running in demo mode. Connect the Phase 7 backend to enable live Gemini responses.',
        research: 'Neura Research is running in demo mode. Connect the Phase 7 backend to enable live Gemini responses.',
        creative: 'Neura Creative is running in demo mode. Connect the Phase 7 backend to enable live Gemini responses.',
      };
      const words = (responses[agentId] || responses.general).split(' ');
      for (let i = 0; i < words.length; i++) {
        await delay(20);
        if (signal?.aborted) return;
        yield (i === 0 ? '' : ' ') + words[i];
      }
      return;
    }

    const response = await fetch(
      `${appEnv.apiUrl}/api/chat`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({
          conversationId,
          content,
          agentId,
          webResearch: options?.webResearch ?? false,
          webOptions: options?.webOptions,
        }),
        signal,
      },
    );

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error?.message ?? 'AI request failed.');
    }

    if (!response.body) throw new Error('The server did not return a streaming response.');

    yield* parseSse(response.body, signal);
  },

  async *regenerateStream(
    conversationId: string,
    signal?: AbortSignal,
  ): AsyncGenerator<string> {
    if (useMock()) {
      yield* this.streamResponse(conversationId, 'regenerate', 'general', signal);
      return;
    }

    const response = await fetch(
      `${appEnv.apiUrl}/api/chat/regenerate`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({ conversationId }),
        signal,
      },
    );

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error?.message ?? 'Regeneration failed.');
    }

    if (!response.body) throw new Error('The server did not return a streaming response.');

    yield* parseSse(response.body, signal);
  },
};

export async function* parseSse(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      if (signal?.aborted) return;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() ?? '';

      for (const event of events) {
        const lines = event.split(/\r?\n/);
        const eventName = lines.find((line) => line.startsWith('event:'))?.slice(6).trim();
        const dataLine = lines.find((line) => line.startsWith('data:'));
        if (!dataLine) continue;

        const payload = JSON.parse(dataLine.slice(5).trim()) as {
          text?: string;
          code?: string;
          message?: string;
        };

        if (eventName === 'token' && payload.text) {
          yield payload.text;
        } else if (eventName === 'error') {
          throw new Error(payload.message ?? 'AI generation failed.');
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export const documentService = {
  async list(query = ''): Promise<DocumentItem[]> {
    if (useMock()) {
      const q = query.trim().toLowerCase();
      return q ? MOCK_DOCUMENTS.filter((doc) => doc.name.toLowerCase().includes(q)) : MOCK_DOCUMENTS;
    }
    const suffix = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
    const data = await apiFetch<{ documents: any[] }>(`/api/documents${suffix}`);
    return data.documents.map(toDocument);
  },

  async upload(file: File, agentId: string): Promise<DocumentItem> {
    const maxBytes = 20 * 1024 * 1024;
    if (file.size === 0) throw new Error('The selected file is empty.');
    if (file.size > maxBytes) throw new Error('File exceeds the 20 MB upload limit.');
    if (useMock()) {
      await delay(600);
      return {
        id: `doc-${Date.now()}`, name: file.name, type: detectType(file.name), size: formatSize(file.size),
        uploadedAt: new Date().toISOString(), status: 'ready', agentId: agentId as DocumentItem['agentId'],
      };
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    const mimeByExtension: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    const mimeType = file.type || mimeByExtension[extension] || 'application/octet-stream';
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
    }
    const contentBase64 = btoa(binary);

    const data = await apiFetch<{ document: any }>('/api/documents/upload', {
      method: 'POST',
      body: JSON.stringify({
        name: file.name,
        mimeType,
        contentBase64,
        agentId,
      }),
    });
    return toDocument(data.document);
  },

  previewUrl(id: string): string {
    return `${appEnv.apiUrl}/api/documents/${encodeURIComponent(id)}/preview`;
  },

  async getTextPreview(id: string): Promise<string> {
    if (useMock()) return 'Preview is available when live API mode is enabled.';
    const response = await fetch(this.previewUrl(id), { credentials: 'include' });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error?.message ?? 'Unable to preview document.');
    }
    return response.text();
  },

  async delete(id: string): Promise<void> {
    if (!useMock()) await apiFetch<void>(`/api/documents/${id}`, { method: 'DELETE' });
  },
};



export type WebSource = {
  id: string;
  title: string;
  url: string;
  snippet: string;
  score: number | null;
  publishedAt: string | null;
  domain: string;
};

export const researchService = {
  async search(query: string, options: Record<string, unknown> = {}): Promise<{ query: string; sources: WebSource[] }> {
    if (useMock()) return { query, sources: [] };
    return apiFetch<{ query: string; sources: WebSource[] }>('/api/research/search', {
      method: 'POST',
      body: JSON.stringify({ query, ...options }),
    });
  },

  async research(query: string, options: Record<string, unknown> = {}): Promise<{ query: string; report: string; sources: WebSource[] }> {
    if (useMock()) {
      return { query, report: 'Enable live API mode to run web research.', sources: [] };
    }
    return apiFetch<{ query: string; report: string; sources: WebSource[] }>('/api/research', {
      method: 'POST',
      body: JSON.stringify({ query, ...options }),
    });
  },
};


export const memoryService = {
  async list(): Promise<Memory[]> {
    if (useMock()) return [];
    const data = await apiFetch<{ memories: Memory[] }>('/api/memories');
    return data.memories;
  },
  async create(content: string): Promise<Memory> {
    if (useMock()) return { id: `memory-${Date.now()}`, content, source: 'manual', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const data = await apiFetch<{ memory: Memory }>('/api/memories', { method: 'POST', body: JSON.stringify({ content, source: 'manual' }) });
    return data.memory;
  },
  async update(id: string, content: string): Promise<Memory> {
    if (useMock()) return { id, content, source: 'manual', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const data = await apiFetch<{ memory: Memory }>(`/api/memories/${id}`, { method: 'PATCH', body: JSON.stringify({ content }) });
    return data.memory;
  },
  async remove(id: string): Promise<void> {
    if (!useMock()) await apiFetch<void>(`/api/memories/${id}`, { method: 'DELETE' });
  },
  async clear(): Promise<void> {
    if (!useMock()) await apiFetch<void>('/api/memories', { method: 'DELETE' });
  },
};

const MOCK_SETTINGS_KEY = 'neura-v5-settings';
const defaultMockSettings: UserSettings = {
  userId: MOCK_USER.id,
  defaultAgentId: 'general',
  theme: 'dark',
  language: 'en',
  customInstructions: '',
  streamingResponses: true,
  verboseResponses: false,
  autoSuggestFollowups: true,
  saveConversationHistory: true,
  emailNotifications: true,
  conversationResponses: true,
  documentProcessingNotifications: true,
  productUpdates: false,
  securityAlerts: true,
  allowDataTraining: false,
  activityTracking: true,
  codeSyntaxHighlighting: true,
  fontSize: 'medium',
};

function getMockSettings(): UserSettings {
  try {
    const raw = window.localStorage.getItem(MOCK_SETTINGS_KEY);
    return raw ? { ...defaultMockSettings, ...(JSON.parse(raw) as Partial<UserSettings>) } : defaultMockSettings;
  } catch {
    return defaultMockSettings;
  }
}

export const settingsService = {
  async get(): Promise<UserSettings | null> {
    if (useMock()) return getMockSettings();
    const data = await apiFetch<{ settings: UserSettings }>('/api/user/settings');
    return data.settings;
  },
  async update(data: Partial<UserSettings>): Promise<UserSettings> {
    if (useMock()) {
      const next = { ...getMockSettings(), ...data };
      window.localStorage.setItem(MOCK_SETTINGS_KEY, JSON.stringify(next));
      return next;
    }
    const response = await apiFetch<{ settings: UserSettings }>('/api/user/settings', { method: 'PATCH', body: JSON.stringify(data) });
    return response.settings;
  },
};

export const userService = {
  async getProfile(): Promise<User> {
    if (useMock()) return MOCK_USER;
    const data = await apiFetch<{ user: User }>('/api/user/profile');
    return data.user;
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    if (useMock()) return { ...MOCK_USER, ...data };
    const response = await apiFetch<{ user: User }>('/api/user/profile', {
      method: 'PATCH', body: JSON.stringify(data),
    });
    return response.user;
  },
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function detectType(name: string): DocumentItem['type'] {
  const ext = name.split('.').pop()?.toLowerCase();
  const map: Record<string, DocumentItem['type']> = {
    pdf: 'pdf', docx: 'docx', doc: 'docx', txt: 'txt', md: 'md', csv: 'csv',
    png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image',
  };
  return map[ext || ''] || 'txt';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


export type RagSource = {
  documentId: string;
  documentName: string;
  chunkIndex: number;
  page: number | null;
  score: number;
};

export const ragService = {
  async reindex(documentId: string): Promise<void> {
    if (useMock()) return;
    await apiFetch(`/api/documents/${documentId}/reindex`, { method: 'POST' });
  },
  async collections(): Promise<any[]> {
    if (useMock()) return [];
    const data = await apiFetch<{ collections: any[] }>('/api/collections');
    return data.collections;
  },
  async createCollection(name: string, description?: string): Promise<any> {
    const data = await apiFetch<{ collection: any }>('/api/collections', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
    return data.collection;
  },
  async addToCollection(collectionId: string, documentId: string): Promise<void> {
    await apiFetch(`/api/collections/${collectionId}/documents/${documentId}`, { method: 'POST' });
  },
  async removeFromCollection(collectionId: string, documentId: string): Promise<void> {
    await apiFetch(`/api/collections/${collectionId}/documents/${documentId}`, { method: 'DELETE' });
  },
};


export const studyService = {
  generate: async (payload: { mode: string; topic: string; context?: string; agentId?: string }) => {
    return apiFetch<{ mode: string; topic: string; result: string; agentId: string; provider: string; model: string }>(
      '/api/study/generate',
      { method: 'POST', body: JSON.stringify(payload) },
    );
  },
};


export const developerService = {
  async explain(code: string, language: string, task: string) {
    return apiFetch<{ result: string; agentId: string; provider: string; model: string }>('/api/developer/explain', {
      method: 'POST',
      body: JSON.stringify({ code, language, task }),
    });
  },
  async analyzeRepository(repository: string, question?: string) {
    return apiFetch<{ repository: string; defaultBranch: string; stars: number; language: string | null; truncated: boolean; filesInspected: string[]; analysis: string }>('/api/developer/github/analyze', {
      method: 'POST',
      body: JSON.stringify({ repository, question }),
    });
  },
  execute(code: string, language: 'javascript' | 'python') {
    return apiFetch<{ stdout: string; stderr: string; timedOut: boolean }>('/api/developer/execute', {
      method: 'POST',
      body: JSON.stringify({ code, language }),
    });
  },
  status() {
    return apiFetch<{ available: boolean; enabled: boolean; dockerDetected: boolean | null; reason: string | null }>('/api/developer/status');
  },
};


export const productivityService = {
  async tasks(): Promise<import('@/types').ProductivityTask[]> { const d=await apiFetch<{tasks: import('@/types').ProductivityTask[]}>('/api/productivity/tasks'); return d.tasks; },
  async createTask(data: {title:string;description?:string;priority?:string;dueAt?:string}) { const d=await apiFetch<{task: import('@/types').ProductivityTask}>('/api/productivity/tasks',{method:'POST',body:JSON.stringify(data)}); return d.task; },
  async updateTask(id:string,data:Record<string,unknown>) { const d=await apiFetch<{task: import('@/types').ProductivityTask}>(`/api/productivity/tasks/${id}`,{method:'PATCH',body:JSON.stringify(data)}); return d.task; },
  async deleteTask(id:string) { await apiFetch(`/api/productivity/tasks/${id}`,{method:'DELETE'}); },
  async prompts(): Promise<import('@/types').SavedPrompt[]> { const d=await apiFetch<{prompts: import('@/types').SavedPrompt[]}>('/api/productivity/prompts'); return d.prompts; },
  async createPrompt(data:{title:string;prompt:string;category?:string}) { const d=await apiFetch<{prompt: import('@/types').SavedPrompt}>('/api/productivity/prompts',{method:'POST',body:JSON.stringify(data)}); return d.prompt; },
  async deletePrompt(id:string) { await apiFetch(`/api/productivity/prompts/${id}`,{method:'DELETE'}); },
  async notes(): Promise<import('@/types').WorkspaceNote[]> { const d=await apiFetch<{notes: import('@/types').WorkspaceNote[]}>('/api/productivity/notes'); return d.notes; },
  async saveNote(data:{id?:string;title:string;content:string}) { const d=await apiFetch<{note: import('@/types').WorkspaceNote}>('/api/productivity/notes',{method:'POST',body:JSON.stringify(data)}); return d.note; },
  async deleteNote(id:string) { await apiFetch(`/api/productivity/notes/${id}`,{method:'DELETE'}); },
};
export const analyticsService = {
  async overview() {
    if (useMock()) {
      const conversations = MOCK_CONVERSATIONS;
      const messages = conversations.reduce((sum, conversation) => sum + conversation.messages.length, 0);
      const agentMap = new Map<string, number>();
      for (const conversation of conversations) agentMap.set(conversation.agentId, (agentMap.get(conversation.agentId) ?? 0) + 1);
      return {
        totals: { conversations: conversations.length, messages, documents: MOCK_DOCUMENTS.length, memories: 0, tasks: 0, prompts: 0 },
        conversationsByDay: [],
        mostUsedAgents: [...agentMap.entries()].map(([agentId, count]) => ({ agentId, conversations: count })).sort((a, b) => b.conversations - a.conversations),
      };
    }
    return apiFetch<{totals:Record<string,number>;conversationsByDay:Array<{date:string;count:number}>;mostUsedAgents:Array<{agentId:string;conversations:number}>}>('/api/analytics/overview');
  },
};
