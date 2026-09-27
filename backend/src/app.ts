import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import { env } from './config/env.js';
import { initSentry } from './config/sentry.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { agentsRouter } from './routes/agents.js';
import { conversationsRouter } from './routes/conversations.js';
import { messagesRouter } from './routes/messages.js';
import { documentsRouter } from './routes/documents.js';
import { userRouter } from './routes/user.js';
import { memoryRouter } from './routes/memory.js';
import { chatRouter } from './routes/chat.js';
import { collectionsRouter } from './routes/collections.js';
import { aiRouter } from './routes/ai.js';
import { researchRouter } from './routes/research.js';
import { studyRouter } from './routes/study.js';
import { developerRouter } from './routes/developer.js';
import { productivityRouter } from './routes/productivity.js';
import { analyticsRouter } from './routes/analytics.js';
import { shareRouter } from './routes/share.js';
import { apiRateLimiter } from './middleware/rateLimit.js';
import { auditMutation } from './middleware/audit.js';
import { errorHandler } from './middleware/errorHandler.js';

// Fire-and-forget: initialization is a dynamic import (unavoidably async),
// but nothing here needs to block on it — by the time any request can error,
// this microtask has long since resolved. A no-op when SENTRY_DSN isn't set.
void initSentry();

export const app = express();

app.disable('x-powered-by');

app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
// Base64-encoded uploads are ~37% larger than the raw file, plus JSON/field
// overhead. Scale the body limit from the configurable upload cap so a raised
// DOCUMENT_MAX_SIZE_MB can't silently exceed the parser's hard limit.
const jsonBodyLimitMb = Math.max(5, Math.ceil(env.DOCUMENT_MAX_SIZE_MB * 1.4) + 2);
app.use(express.json({ limit: `${jsonBodyLimitMb}mb` }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser());

app.use((req, res, next) => {
  const requestId = req.header('x-request-id') || crypto.randomUUID();
  res.setHeader('x-request-id', requestId);
  next();
});

app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(apiRateLimiter);
app.use(auditMutation);

app.get('/', (_req, res) => {
  res.json({
    name: 'Neura V5 API',
    version: '0.1.0',
    status: 'running',
  });
});

app.use('/api/health', healthRouter);
app.use('/api/chat', chatRouter);
app.use('/api/auth', authRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/conversations', messagesRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/collections', collectionsRouter);
app.use('/api/user', userRouter);
app.use('/api/memories', memoryRouter);
app.use('/api/ai', aiRouter);
app.use('/api/research', researchRouter);
app.use('/api/study', studyRouter);
app.use('/api/developer', developerRouter);
app.use('/api/productivity', productivityRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/share', shareRouter);

app.use((_req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
});

// Reports 5xx errors and captures uncaught cases to Sentry (when configured)
// before responding — see captureException calls inside errorHandler.
app.use(errorHandler);
