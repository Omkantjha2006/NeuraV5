import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/http.js';
import { env } from '../config/env.js';
import { captureException } from '../config/sentry.js';

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  const requestId = res.getHeader('x-request-id');

  if (error instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.issues,
        requestId,
      },
    });
  }

  if (
    error instanceof Error &&
    (error as Error & { type?: string }).type === 'entity.too.large'
  ) {
    return res.status(413).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'The request body is too large.',
        requestId,
      },
    });
  }

  if (error instanceof AppError) {
    // Only server-side failures (5xx) are worth tracking — 4xx AppErrors
    // (validation, not-found, bad input) are expected traffic, not incidents.
    if (error.statusCode >= 500) {
      captureException(error, { requestId, method: req.method, path: req.originalUrl, code: error.code });
    }
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        requestId,
      },
    });
  }

  captureException(error, { requestId, method: req.method, path: req.originalUrl });
  console.error('Unhandled request error', {
    requestId,
    method: req.method,
    path: req.originalUrl,
    error,
  });

  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      requestId,
      ...(env.NODE_ENV !== 'production' && error instanceof Error
        ? { details: error.message }
        : {}),
    },
  });
}
