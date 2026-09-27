import { env } from '../../config/env.js';
import { AppError } from '../../utils/http.js';
import { TimeoutController, normalizeTimeoutError } from './timeoutController.js';
import type { AIProvider, GatewayMessage, ProviderGenerateOptions } from './types.js';

type OpenAIChunk = {
  choices?: Array<{ delta?: { content?: string | null } }>;
  error?: { message?: string };
};

function toOpenAIMessages(options: ProviderGenerateOptions) {
  return [
    { role: 'system', content: options.systemPrompt },
    ...options.messages.map((message) => ({
      role: message.role === 'model' ? 'assistant' : 'user',
      content: message.content,
    })),
  ];
}

async function openStream(options: ProviderGenerateOptions, signal: AbortSignal): Promise<Response> {
  if (!env.OPENAI_API_KEY) {
    throw new AppError(503, 'OpenAI API key is not configured on the server.', 'AI_NOT_CONFIGURED');
  }

  const response = await fetch(`${env.OPENAI_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    signal,
    body: JSON.stringify({
      model: options.model,
      messages: toOpenAIMessages(options),
      temperature: options.temperature ?? env.GEMINI_TEMPERATURE,
      stream: true,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    let message = `OpenAI request failed (${response.status}).`;
    try {
      const payload = JSON.parse(text) as { error?: { message?: string } };
      if (payload.error?.message) message = payload.error.message;
    } catch {
      // Keep the generic HTTP error when the provider did not return JSON.
    }
    throw new AppError(response.status >= 500 ? 502 : response.status, message, 'AI_PROVIDER_ERROR');
  }

  if (!response.body) {
    throw new AppError(502, 'OpenAI returned an empty streaming response.', 'AI_EMPTY_STREAM');
  }

  return response;
}

async function* stream(options: ProviderGenerateOptions): AsyncGenerator<string> {
  // Aborts the request if no chunk arrives within AI_PROVIDER_TIMEOUT_MS,
  // whether that's a hung connection or a stall mid-stream, in addition to
  // honoring the caller's own abort signal (e.g. client disconnect).
  const timeout = new TimeoutController(env.AI_PROVIDER_TIMEOUT_MS, options.signal);

  try {
    const response = await openStream(options, timeout.signal);
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        timeout.reset();

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const raw = line.slice(5).trim();
          if (!raw || raw === '[DONE]') continue;

          let chunk: OpenAIChunk;
          try {
            chunk = JSON.parse(raw) as OpenAIChunk;
          } catch {
            continue;
          }

          if (chunk.error?.message) {
            throw new AppError(502, chunk.error.message, 'AI_PROVIDER_ERROR');
          }

          const text = chunk.choices?.[0]?.delta?.content ?? '';
          if (text) yield text;
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    throw normalizeTimeoutError(error, timeout);
  } finally {
    timeout.clear();
  }
}

export const openAIProvider: AIProvider = {
  id: 'openai',
  name: 'OpenAI',
  defaultModel: 'gpt-4.1-mini',
  envKey: 'OPENAI_API_KEY',
  isConfigured: () => Boolean(env.OPENAI_API_KEY),
  stream,
};
