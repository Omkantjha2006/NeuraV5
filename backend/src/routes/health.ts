import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';

export const healthRouter = Router();

// Liveness does not require the database. It answers whether the API process is running.
healthRouter.get('/live', (_req, res) => {
  res.json({ status: 'ok', service: 'neura-api' });
});

// Readiness verifies the API can reach PostgreSQL.
healthRouter.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', service: 'neura-api', database: 'ok' });
  } catch (error) {
    console.error('Database readiness check failed', error);
    res.status(503).json({
      status: 'unavailable',
      service: 'neura-api',
      database: 'unavailable',
      ...(env.NODE_ENV !== 'production' && error instanceof Error
        ? { details: error.message }
        : {}),
    });
  }
});

// Backward-compatible health endpoint used by the frontend/local setup.
healthRouter.get('/', async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', service: 'neura-api', database: 'ok' });
  } catch (error) {
    next(error);
  }
});
