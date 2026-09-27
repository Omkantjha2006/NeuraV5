import { env } from './env.js';

// Sentry is entirely optional: with no SENTRY_DSN set, every export here is a
// no-op, so nothing changes for anyone who hasn't configured it. When a DSN
// is set but the @sentry/node package hasn't been installed yet (e.g. right
// after pulling this change, before `npm install`), we degrade to a no-op
// with a console warning instead of crashing the server.
type SentryModule = typeof import('@sentry/node');

let sentry: SentryModule | undefined;
let initialized = false;

export async function initSentry(): Promise<void> {
  if (initialized || !env.SENTRY_DSN) return;
  try {
    sentry = await import('@sentry/node');
    sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,
      tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
    });
    initialized = true;
  } catch (error) {
    console.warn(
      'SENTRY_DSN is set but @sentry/node could not be loaded (run `npm install`). Error tracking is disabled.',
      error,
    );
  }
}

export function isSentryEnabled(): boolean {
  return initialized;
}

/**
 * Manually report an error. Used from the shared Express error-handling
 * middleware plus places that never reach it — SSE streaming responses and
 * process-level uncaught exception/rejection handlers.
 */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!initialized || !sentry) return;
  sentry.captureException(error, context ? { extra: context } : undefined);
}
