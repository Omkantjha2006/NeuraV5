import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),
  SESSION_COOKIE_NAME: z.string().default('neura_session'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),
  GOOGLE_STATE_COOKIE_NAME: z.string().default('neura_google_state'),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  TAVILY_API_KEY: z.string().optional(),
  TAVILY_API_BASE_URL: z.string().url().default('https://api.tavily.com'),
  WEB_SEARCH_MAX_RESULTS: z.coerce.number().int().positive().max(20).default(8),
  WEB_SEARCH_DEPTH: z.enum(['basic', 'advanced', 'fast', 'ultra-fast']).default('basic'),
  WEB_SEARCH_TIMEOUT_MS: z.coerce.number().int().positive().max(60_000).default(15_000),
  DEFAULT_AI_PROVIDER: z.enum(['google', 'openai']).default('google'),
  GEMINI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.7),
  // Inactivity timeout for AI provider streaming calls: aborted if no chunk of
  // the response arrives within this window (resets on every chunk), and also
  // covers a hung initial connection. Independent of total response length.
  AI_PROVIDER_TIMEOUT_MS: z.coerce.number().int().positive().max(300_000).default(60_000),
  // Retries apply only while zero tokens have been streamed back yet (i.e. the
  // failure happened during connect / before the provider sent any content),
  // so a retry can never duplicate or corrupt partial output.
  AI_PROVIDER_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
  AI_PROVIDER_RETRY_BASE_MS: z.coerce.number().int().positive().max(10_000).default(500),
  DOCUMENT_UPLOAD_DIR: z.string().default('uploads'),
  DOCUMENT_MAX_SIZE_MB: z.coerce.number().int().positive().max(100).default(20),
  GEMINI_EMBEDDING_MODEL: z.string().default('gemini-embedding-001'),
  RAG_TOP_K: z.coerce.number().int().positive().max(20).default(6),
  RAG_CHUNK_SIZE: z.coerce.number().int().positive().min(200).max(5000).default(1200),
  RAG_CHUNK_OVERLAP: z.coerce.number().int().nonnegative().min(0).max(1000).default(200),
  GITHUB_TOKEN: z.string().optional(),
  CODE_EXECUTION_ENABLED: z.enum(['true', 'false']).default('false'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  // Optional error-tracking (Sentry or compatible). Left unset, monitoring is a no-op.
  SENTRY_DSN: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0),
});

// dotenv loads a blank `KEY=` line as an empty string, not undefined. Zod's
// `.optional()` only treats `undefined` as "not set", so an empty string on
// an optional-but-validated field (e.g. RESEND_FROM_EMAIL's `.min(1)`) fails
// validation instead of being skipped. Normalize blanks to undefined first
// so leaving an optional key empty behaves the same as omitting it entirely.
const rawEnv = Object.fromEntries(
  Object.entries(process.env).map(([key, value]) => [key, value === '' ? undefined : value]),
);

const parsed = schema.safeParse(rawEnv);
if (!parsed.success) throw new Error(parsed.error.message);
if (parsed.data.NODE_ENV === 'production' && (!parsed.data.RESEND_API_KEY || !parsed.data.RESEND_FROM_EMAIL)) {
  throw new Error('RESEND_API_KEY and RESEND_FROM_EMAIL are required in production for password-reset email delivery.');
}
export const env = parsed.data;

