import { RequestHandler } from 'express';
import { prisma } from '../config/prisma.js';

// Authentication and account-security actions (login, logout, password reset,
// etc.) are always audited: they're a security trail, not a product-analytics
// feature, so the user's "activity tracking" preference (which this app
// describes to users as "track your usage patterns for insights") doesn't
// apply to them.
const ALWAYS_AUDITED_PREFIX = '/api/auth';

export const auditMutation: RequestHandler = (req, _res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  const originalEnd = _res.end.bind(_res);
  _res.end = ((...args: any[]) => {
    void (async () => {
      const userId = req.userId;
      const alwaysAudited = `${req.baseUrl}${req.path}`.startsWith(ALWAYS_AUDITED_PREFIX);

      if (userId && !alwaysAudited) {
        // Respect the user's "activity tracking" privacy toggle for everything
        // that isn't a security-critical auth action.
        const settings = await prisma.userSettings.findUnique({
          where: { userId },
          select: { activityTracking: true },
        }).catch(() => null);
        if (settings?.activityTracking === false) return;
      }

      await prisma.auditLog.create({
        data: {
          userId,
          action: `${req.method} ${req.baseUrl}${req.path}`.slice(0, 255),
          resource: req.path.slice(0, 255),
          ipAddress: req.ip?.slice(0, 100),
        },
      }).catch(() => undefined);
    })();
    return originalEnd(...args);
  }) as typeof _res.end;
  next();
};
