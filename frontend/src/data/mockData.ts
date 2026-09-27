import type { Conversation, DocumentItem, Message } from '@/types';

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    title: 'React state management patterns',
    agentId: 'code',
    pinned: true,
    archived: false,
    createdAt: new Date(Date.now() - 3600_000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600_000 * 1).toISOString(),
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: 'What are the best state management patterns for a medium-sized React app?',
        createdAt: new Date(Date.now() - 3600_000 * 2).toISOString(),
      },
      {
        id: 'm2',
        role: 'assistant',
        agentId: 'code',
        content:
          'For a medium-sized React app, here are the most effective state management patterns:\n\n1. **Local State (useState)** — Use for component-specific UI state like toggles, inputs, and modals.\n\n2. **Lifted State** — Move shared state to the nearest common parent. Simple and effective for small trees.\n\n3. **Context + useReducer** — Great for app-wide settings, auth, or theme. Avoid over-using Context for high-frequency updates.\n\n4. **Zustand** — Lightweight, no boilerplate, works outside React tree. Ideal for medium apps that need shared state without Redux overhead.\n\n5. **React Query / TanStack Query** — For server state (API data, caching, synchronization). Often eliminates the need for global state.\n\n**Recommendation**: Start with local state + React Query for server data. Add Zustand only when you have genuinely shared client state across distant components.',
        createdAt: new Date(Date.now() - 3600_000 * 2 + 5000).toISOString(),
      },
    ],
  },
  {
    id: 'conv-2',
    title: 'Explain quantum entanglement simply',
    agentId: 'study',
    pinned: true,
    archived: false,
    createdAt: new Date(Date.now() - 3600_000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600_000 * 4).toISOString(),
    messages: [
      {
        id: 'm3',
        role: 'user',
        content: 'Can you explain quantum entanglement in simple terms?',
        createdAt: new Date(Date.now() - 3600_000 * 5).toISOString(),
      },
      {
        id: 'm4',
        role: 'assistant',
        agentId: 'study',
        content:
          'Imagine you have two magic coins. You give one to a friend who travels to the other side of the world. When you flip your coin and it lands heads, your friend\'s coin will instantly land tails — every single time, no matter how far apart you are.\n\nThat\'s essentially **quantum entanglement**: two particles become linked so that measuring one immediately tells you the state of the other, regardless of distance. Einstein called it "spooky action at a distance."\n\nKey points:\n- The link is created when the particles interact closely\n- Measuring one particle "collapses" both into definite states\n- No information travels between them — it\'s correlation, not communication\n- It\'s the foundation of quantum computing and teleportation research',
        createdAt: new Date(Date.now() - 3600_000 * 5 + 8000).toISOString(),
      },
    ],
  },
  {
    id: 'conv-3',
    title: 'Market research: EV adoption trends',
    agentId: 'research',
    pinned: false,
    archived: false,
    createdAt: new Date(Date.now() - 3600_000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 3600_000 * 18).toISOString(),
    messages: [
      {
        id: 'm5',
        role: 'user',
        content: 'Summarize the current EV adoption trends globally.',
        createdAt: new Date(Date.now() - 3600_000 * 20).toISOString(),
      },
      {
        id: 'm6',
        role: 'assistant',
        agentId: 'research',
        content:
          'Global EV adoption is accelerating rapidly:\n\n- **2023 sales**: ~14 million EVs sold globally, a 35% YoY increase\n- **China** leads with ~60% of global EV sales\n- **Europe** holds ~25%, driven by stringent emission targets\n- **US** is catching up with IRA incentives boosting domestic production\n- **Price parity** with ICE vehicles expected by 2025-2027 for most segments\n- **Charging infrastructure** remains the biggest bottleneck\n- **Battery tech**: Solid-state batteries approaching commercialization, promising 2x range\n\nThe trajectory suggests EVs will reach 50% of new car sales globally by 2030.',
        createdAt: new Date(Date.now() - 3600_000 * 20 + 12000).toISOString(),
      },
    ],
  },
  {
    id: 'conv-4',
    title: 'Brainstorming sci-fi short story ideas',
    agentId: 'creative',
    pinned: false,
    archived: false,
    createdAt: new Date(Date.now() - 86400_000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400_000 * 2 + 3600_000).toISOString(),
    messages: [],
  },
  {
    id: 'conv-5',
    title: 'Weekly meal plan optimization',
    agentId: 'general',
    pinned: false,
    archived: false,
    createdAt: new Date(Date.now() - 86400_000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400_000 * 3 + 3600_000).toISOString(),
    messages: [],
  },
  {
    id: 'conv-6',
    title: 'Debug: async race condition in Node',
    agentId: 'code',
    pinned: false,
    archived: false,
    createdAt: new Date(Date.now() - 86400_000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400_000 * 5 + 3600_000).toISOString(),
    messages: [],
  },
  {
    id: 'conv-7',
    title: 'Flashcard set: Organic chemistry',
    agentId: 'study',
    pinned: false,
    archived: false,
    createdAt: new Date(Date.now() - 86400_000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 86400_000 * 12 + 3600_000).toISOString(),
    messages: [],
  },
  {
    id: 'conv-8',
    title: 'Climate policy comparison: EU vs US',
    agentId: 'research',
    pinned: false,
    archived: true,
    createdAt: new Date(Date.now() - 86400_000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 86400_000 * 28).toISOString(),
    messages: [],
  },
];

export const MOCK_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc-1',
    name: 'Q3 Financial Report.pdf',
    type: 'pdf',
    size: '2.4 MB',
    uploadedAt: new Date(Date.now() - 3600_000 * 3).toISOString(),
    status: 'ready',
    agentId: 'research',
    pages: 42,
  },
  {
    id: 'doc-2',
    name: 'Product Requirements.docx',
    type: 'docx',
    size: '156 KB',
    uploadedAt: new Date(Date.now() - 3600_000 * 8).toISOString(),
    status: 'ready',
    agentId: 'general',
    pages: 12,
  },
  {
    id: 'doc-3',
    name: 'Research Dataset.csv',
    type: 'csv',
    size: '8.7 MB',
    uploadedAt: new Date(Date.now() - 3600_000 * 12).toISOString(),
    status: 'processing',
    agentId: 'research',
  },
  {
    id: 'doc-4',
    name: 'Meeting Notes.txt',
    type: 'txt',
    size: '24 KB',
    uploadedAt: new Date(Date.now() - 86400_000).toISOString(),
    status: 'ready',
    agentId: 'general',
  },
  {
    id: 'doc-5',
    name: 'Architecture Diagram.png',
    type: 'image',
    size: '1.1 MB',
    uploadedAt: new Date(Date.now() - 86400_000 * 2).toISOString(),
    status: 'ready',
    agentId: 'code',
  },
  {
    id: 'doc-6',
    name: 'API Documentation.md',
    type: 'md',
    size: '89 KB',
    uploadedAt: new Date(Date.now() - 86400_000 * 4).toISOString(),
    status: 'error',
    agentId: 'code',
  },
];

export const MOCK_USER = {
  id: 'user-1',
  name: 'Alex Morgan',
  email: 'alex.morgan@example.com',
  plan: 'Pro' as const,
};

export function createMessage(role: 'user' | 'assistant', content: string, agentId?: string): Message {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
    agentId: agentId as Message['agentId'],
  };
}
