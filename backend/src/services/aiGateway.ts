import { env } from '../config/env.js';
import { AppError } from '../utils/http.js';
import { googleProvider } from './providers/googleProvider.js';
import { openAIProvider } from './providers/openaiProvider.js';
import type { AIProvider, ProviderGenerateOptions } from './providers/types.js';

export type { GatewayMessage } from './providers/types.js';

export type GenerateOptions = ProviderGenerateOptions & {
  provider: string;
};

const providers: Record<string, AIProvider> = {
  google: googleProvider,
  openai: openAIProvider,
};

export function listProviders() {
  return Object.values(providers).map((provider) => ({
    id: provider.id,
    name: provider.name,
    defaultModel: provider.defaultModel,
    configured: provider.isConfigured(),
  }));
}

export function getProvider(providerId: string): AIProvider {
  const provider = providers[providerId];
  if (!provider) {
    throw new AppError(400, `Unsupported AI provider: ${providerId}`, 'UNSUPPORTED_PROVIDER');
  }
  return provider;
}

export function resolveProviderModel(providerId?: string, model?: string) {
  const provider = getProvider(providerId ?? env.DEFAULT_AI_PROVIDER);
  return {
    provider: provider.id,
    model: model?.trim() || provider.defaultModel,
  };
}

// Errors worth retrying: rate limits, upstream/server failures, our own
// inactivity-timeout wrapper, and raw network failures (e.g. ECONNRESET,
// DNS blips) that reach us as plain Errors rather than an AppError. A client
// disconnect surfaces as an AbortError and is deliberately excluded — the
// caller is gone, so there's nothing to retry for.
function isRetryableError(error: unknown): boolean {
  if (error instanceof AppError) {
    if (error.code === 'AI_NOT_CONFIGURED' || error.code === 'UNSUPPORTED_PROVIDER') return false;
    return error.statusCode === 429 || error.statusCode >= 500;
  }
  if (error instanceof Error && error.name === 'AbortError') return false;
  return true;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Streams a completion, retrying with exponential backoff on transient
 * provider failures. Retries only ever happen before the first token of an
 * attempt has been yielded — once any content has reached the caller,
 * retrying would mean silently duplicating or corrupting partial output, so
 * the failure is surfaced instead.
 */
export async function* streamCompletion(options: GenerateOptions): AsyncGenerator<string> {
  const provider = getProvider(options.provider);
  if (!provider.isConfigured()) {
    throw new AppError(503, `${provider.name} is not configured on the server.`, 'AI_NOT_CONFIGURED');
  }

  const maxAttempts = 1 + env.AI_PROVIDER_MAX_RETRIES;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let yieldedAny = false;
    try {
      for await (const token of provider.stream(options)) {
        yieldedAny = true;
        yield token;
      }
      return;
    } catch (error) {
      const isLastAttempt = attempt >= maxAttempts;
      if (yieldedAny || isLastAttempt || options.signal?.aborted || !isRetryableError(error)) {
        throw error;
      }
      await delay(env.AI_PROVIDER_RETRY_BASE_MS * 2 ** (attempt - 1));
    }
  }
}

export async function generateCompletion(options: GenerateOptions): Promise<string> {
  let output = '';
  for await (const token of streamCompletion(options)) {
    output += token;
  }
  return output;
}
