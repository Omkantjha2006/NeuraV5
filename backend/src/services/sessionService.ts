import type { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { hashToken, randomToken } from '../utils/crypto.js';

export async function createSession(userId: string, res: Response) {
  const rawToken = randomToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.SESSION_TTL_DAYS);

  // Remove expired sessions opportunistically for this user before creating a fresh session.
  await prisma.session.deleteMany({ where: { userId, expiresAt: { lte: new Date() } } });

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt,
    },
  });

  res.cookie(env.SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.SESSION_COOKIE_SAMESITE,
    expires: expiresAt,
    path: '/',
  });
}

export async function destroySession(rawToken: string | undefined, res: Response) {
  if (rawToken) {
    await prisma.session.deleteMany({
      where: { tokenHash: hashToken(rawToken) },
    });
  }

  res.clearCookie(env.SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.SESSION_COOKIE_SAMESITE,
    path: '/',
  });
}
