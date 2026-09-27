import { env } from '../../config/env.js';
import { AppError } from '../../utils/http.js';
import { TimeoutController, normalizeTimeoutError } from './timeoutController.js';
import type { AIProvider, GatewayMessage, ProviderGenerateOptions } from './types.js';

type GeminiPart = { text?: string };
type GeminiChunk = {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
  error?: { message?: string; status?: string };
};

function toGeminiContents(messages: GatewayMessage[]) {
  return messages.map((message) => ({
    role: message.role,
    parts: [{ text: message.content }],
  }));
}

async function openStream(options: ProviderGenerateOptions, signal: AbortSignal): Promise<Response> {
  if (!env.GEMINI_API_KEY) {
    throw new AppError(503, 'Gemini API key is not configured on the server.', 'AI_NOT_CONFIGURED');
  }

  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(options.model)}:streamGenerateContent`,
  );
  url.searchParams.set('alt', 'sse');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': env.GEMINI_API_KEY,
    },
    signal,
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: options.systemPrompt }] },
      contents: toGeminiContents(options.messages),
      generationConfig: { temperature: options.temperature ?? env.GEMINI_TEMPERATURE },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    let message = `Gemini request failed (${response.status}).`;
    try {
      const payload = JSON.parse(text) as { error?: { message?: string } };
      if (payload.error?.message) message = payload.error.message;
    } catch {
      // Keep the generic HTTP error when Gemini did not return JSON.
    }
    throw new AppError(response.status >= 500 ? 502 : response.status, message, 'AI_PROVIDER_ERROR');
  }

  if (!response.body) {
    throw new AppError(502, 'Gemini returned an empty streaming response.', 'AI_EMPTY_STREAM');
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

          let chunk: GeminiChunk;
          try {
            chunk = JSON.parse(raw) as GeminiChunk;
          } catch {
            continue;
          }

          if (chunk.error?.message) {
            throw new AppError(502, chunk.error.message, 'AI_PROVIDER_ERROR');
          }

          const text = chunk.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
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

export const googleProvider: AIProvider = {
  id: 'google',
  name: 'Google Gemini',
  defaultModel: 'gemini-2.5-flash',
  envKey: 'GEMINI_API_KEY',
  isConfigured: () => Boolean(env.GEMINI_API_KEY),
  stream,
};
