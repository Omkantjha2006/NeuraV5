import { Router } from 'express';
import { authRateLimiter } from '../middleware/rateLimit.js';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { createSession, destroySession } from '../services/sessionService.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../utils/http.js';
import { hashToken, randomToken } from '../utils/crypto.js';
import { sendPasswordResetEmail } from '../services/emailService.js';

export const authRouter = Router();
authRouter.use(authRateLimiter);

const credentialsSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
});

const registerSchema = credentialsSchema.extend({
  name: z.string().trim().min(2).max(100),
});

const resetPasswordSchema = z.object({
  token: z.string().min(32),
  password: z.string().min(8).max(128),
});

function publicUser(user: { id: string; name: string; email: string; avatar: string | null; plan: string; createdAt: Date }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    plan: user.plan,
    createdAt: user.createdAt.toISOString(),
  };
}

function cookieOptions(expires?: Date) {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    ...(expires ? { expires } : {}),
    path: '/',
  };
}

function googleConfigured() {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_CALLBACK_URL);
}

authRouter.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const email = data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError(409, 'An account with this email already exists', 'EMAIL_IN_USE');

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: { name: data.name, email, passwordHash, settings: { create: {} } },
    });

    await createSession(user.id, res);
    res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const data = credentialsSchema.parse(req.body);
    const email = data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash || !(await bcrypt.compare(data.password, user.passwordHash))) {
      throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }

    await createSession(user.id, res);
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    await destroySession(req.cookies?.[env.SESSION_COOKIE_NAME], res);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } });
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().trim().email().max(320) }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (user) {
      const rawToken = randomToken();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: hashToken(rawToken), expiresAt },
      });
      const resetUrl = `${env.FRONTEND_URL.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(rawToken)}`;
      try {
        await sendPasswordResetEmail(user.email, resetUrl);
      } catch (emailError) {
        console.error('Password reset email delivery failed:', emailError);
        if (env.NODE_ENV === 'production') throw emailError;
      }
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    const reset = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!reset || reset.usedAt || reset.expiresAt <= new Date()) {
      throw new AppError(400, 'Invalid or expired password reset token', 'INVALID_RESET_TOKEN');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
      prisma.session.deleteMany({ where: { userId: reset.userId } }),
    ]);

    await createSession(reset.userId, res);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/** Start Google OAuth using a short-lived, HttpOnly state cookie. */
authRouter.get('/google', (req, res, next) => {
  try {
    if (!googleConfigured()) {
      throw new AppError(503, 'Google OAuth is not configured. Set Google OAuth environment variables first.', 'GOOGLE_OAUTH_NOT_CONFIGURED');
    }

    const state = crypto.randomBytes(24).toString('hex');
    res.cookie(env.GOOGLE_STATE_COOKIE_NAME, state, {
      ...cookieOptions(),
      maxAge: 10 * 60 * 1000,
    });

    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      redirect_uri: env.GOOGLE_CALLBACK_URL!,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account',
    });

    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  } catch (error) {
    next(error);
  }
});

authRouter.get('/google/callback', async (req, res, next) => {
  try {
    if (!googleConfigured()) throw new AppError(503, 'Google OAuth is not configured', 'GOOGLE_OAUTH_NOT_CONFIGURED');

    const code = typeof req.query.code === 'string' ? req.query.code : undefined;
    const state = typeof req.query.state === 'string' ? req.query.state : undefined;
    const expectedState = req.cookies?.[env.GOOGLE_STATE_COOKIE_NAME] as string | undefined;
    res.clearCookie(env.GOOGLE_STATE_COOKIE_NAME, cookieOptions());

    if (!code || !state || !expectedState || !crypto.timingSafeEqual(Buffer.from(state), Buffer.from(expectedState))) {
      throw new AppError(400, 'Invalid Google OAuth state', 'INVALID_OAUTH_STATE');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID!,
        client_secret: env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: env.GOOGLE_CALLBACK_URL!,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) throw new AppError(401, 'Google authorization failed', 'GOOGLE_TOKEN_EXCHANGE_FAILED');
    const tokenData = await tokenResponse.json() as { access_token?: string };
    if (!tokenData.access_token) throw new AppError(401, 'Google did not return an access token', 'GOOGLE_TOKEN_MISSING');

    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!profileResponse.ok) throw new AppError(401, 'Could not retrieve Google profile', 'GOOGLE_PROFILE_FAILED');

    const profile = await profileResponse.json() as {
      sub?: string; email?: string; email_verified?: boolean; name?: string; picture?: string;
    };
    if (!profile.sub || !profile.email || profile.email_verified !== true) {
      throw new AppError(401, 'Google account email is unavailable or unverified', 'GOOGLE_EMAIL_UNVERIFIED');
    }

    const email = profile.email.toLowerCase();
    const existingAccount = await prisma.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider: 'google', providerAccountId: profile.sub } },
      include: { user: true },
    });

    let user = existingAccount?.user ?? null;
    if (!user) {
      user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            name: profile.name?.trim() || email.split('@')[0],
            email,
            avatar: profile.picture ?? null,
            settings: { create: {} },
          },
        });
      } else if (!user.avatar && profile.picture) {
        user = await prisma.user.update({ where: { id: user.id }, data: { avatar: profile.picture } });
      }

      await prisma.oAuthAccount.upsert({
        where: { provider_providerAccountId: { provider: 'google', providerAccountId: profile.sub } },
        update: { userId: user.id },
        create: { provider: 'google', providerAccountId: profile.sub, userId: user.id },
      });
    }

    await createSession(user.id, res);
    res.redirect(env.FRONTEND_URL);
  } catch (error) {
    next(error);
  }
});
