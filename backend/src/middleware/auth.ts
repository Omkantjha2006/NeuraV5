import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { hashToken } from '../utils/crypto.js';
import { AppError } from '../utils/http.js';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const rawToken = req.cookies?.[env.SESSION_COOKIE_NAME] as string | undefined;
    if (!rawToken) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');

    const session = await prisma.session.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      select: { userId: true, expiresAt: true },
    });

    if (!session) {
      throw new AppError(401, 'Invalid session', 'INVALID_SESSION');
    }

    if (session.expiresAt <= new Date()) {
      await prisma.session.deleteMany({ where: { tokenHash: hashToken(rawToken) } });
      throw new AppError(401, 'Session expired', 'SESSION_EXPIRED');
    }

    req.userId = session.userId;
    next();
  } catch (error) {
    next(error);
  }
}
