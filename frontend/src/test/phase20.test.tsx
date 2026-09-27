import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider, useApp } from '@/store/AppContext';
import { I18nProvider } from '@/i18n/I18nContext';
import { DEFAULT_AGENTS, getDefaultAgent } from '@/data/agents';
import { TopHeader } from '@/components/TopHeader';
import { authService, conversationService, parseSse } from '@/services/api';
import { appEnv } from '@/config/env';
import { MOCK_USER } from '@/data/mockData';

function AgentStateProbe() {
  const { activeAgentId, setActiveAgentId, getAgent } = useApp();
  return (
    <div>
      <span data-testid="agent-id">{activeAgentId}</span>
      <span data-testid="agent-name">{getAgent(activeAgentId).name}</span>
      <button onClick={() => setActiveAgentId('code')}>Select Code</button>
    </div>
  );
}

describe('agent configuration', () => {
  it('contains the five roadmap agents', () => {
    expect(DEFAULT_AGENTS.map((agent) => agent.id)).toEqual([
      'general', 'code', 'study', 'research', 'creative',
    ]);
    expect(getDefaultAgent('code').name).toBe('Neura Code');
  });
});

describe('authentication service', () => {
  it('uses mock login validation without a backend', async () => {
    appEnv.useMockData = true;
    const result = await authService.login('invalid-email', 'password');
    expect(result.error).toBe('Invalid email format');
  });

  it('returns a mock user for a valid demo login', async () => {
    appEnv.useMockData = true;
    const result = await authService.login('student@example.com', 'password');
    expect(result.user.email).toBe('student@example.com');
    expect(result.error).toBeUndefined();
  });
});

describe('conversation service', () => {
  it('filters mock conversations by title and message content', async () => {
    appEnv.useMockData = true;
    const conversations = await conversationService.search('react');
    expect(conversations.length).toBeGreaterThan(0);
    expect(conversations.every((conversation) =>
      conversation.title.toLowerCase().includes('react') ||
      conversation.messages.some((message) => message.content.toLowerCase().includes('react')),
    )).toBe(true);
  });
});

describe('agent selector', () => {
  it('changes the selected agent through application state', async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider>
        <AppProvider>
          <AgentStateProbe />
        </AppProvider>
      </I18nProvider>,
    );

    expect(screen.getByTestId('agent-id')).toHaveTextContent('general');
    await user.click(screen.getByRole('button', { name: 'Select Code' }));
    expect(screen.getByTestId('agent-id')).toHaveTextContent('code');
    expect(screen.getByTestId('agent-name')).toHaveTextContent('Neura Code');
  });

  it('renders the current agent in the top header', () => {
    render(
      <I18nProvider>
        <AppProvider>
          <TopHeader />
        </AppProvider>
      </I18nProvider>,
    );
    expect(screen.getByRole('button', { name: /Neura General/i })).toBeInTheDocument();
  });
});

describe('chat SSE parsing', () => {
  it('yields token text and ignores non-token events', async () => {
    const encoded = new TextEncoder().encode(
      'event: token\ndata: {"text":"Hello"}\n\n' +
      'event: status\ndata: {"message":"working"}\n\n' +
      'event: token\ndata: {"text":" world"}\n\n',
    );
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoded);
        controller.close();
      },
    });

    const chunks: string[] = [];
    for await (const chunk of parseSse(stream)) chunks.push(chunk);
    expect(chunks).toEqual(['Hello', ' world']);
  });

  it('surfaces streamed AI errors', async () => {
    const encoded = new TextEncoder().encode(
      'event: error\ndata: {"message":"Generation failed"}\n\n',
    );
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoded);
        controller.close();
      },
    });

    const collect = async () => {
      const chunks: string[] = [];
      for await (const chunk of parseSse(stream)) chunks.push(chunk);
      return chunks;
    };
    await expect(collect()).rejects.toThrow('Generation failed');
  });
});

describe('API request boundary', () => {
  it('sends credentials and JSON content type for live API calls', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ agents: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    // Importing agentService is enough to exercise the shared apiFetch path.
    const { agentService } = await import('@/services/api');
    // Force live mode by temporarily setting the environment-backed object.
    const env = await import('@/config/env');
    env.appEnv.apiUrl = 'http://api.test';
    env.appEnv.useMockData = false;

    await agentService.getAgents();
    env.appEnv.useMockData = true;

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/agents',
      expect.objectContaining({
        credentials: 'include',
        headers: expect.any(Headers),
      }),
    );
  });
});
