import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { getActiveAgent } from '../services/agentService.js';

export const userRouter = Router();
userRouter.use(requireAuth);

userRouter.get('/profile', async (req, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.userId! },
      select: { id: true, name: true, email: true, avatar: true, plan: true, createdAt: true },
    });
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

userRouter.patch('/profile', async (req, res, next) => {
  try {
    const data = z.object({
      name: z.string().trim().min(2).max(100).optional(),
      avatar: z.string().url().nullable().optional(),
    }).parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.userId! },
      data,
      select: { id: true, name: true, email: true, avatar: true, plan: true, createdAt: true },
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

userRouter.get('/settings', async (req, res, next) => {
  try {
    const settings = await prisma.userSettings.upsert({
      where: { userId: req.userId! },
      update: {},
      create: { userId: req.userId! },
    });
    res.json({ settings });
  } catch (error) {
    next(error);
  }
});

userRouter.patch('/settings', async (req, res, next) => {
  try {
    const data = z.object({
      defaultAgentId: z.string().optional(),
      theme: z.enum(['light', 'dark', 'midnight', 'system']).optional(),
      language: z.string().optional(),
      customInstructions: z.string().max(10_000).nullable().optional(),
      streamingResponses: z.boolean().optional(),
      verboseResponses: z.boolean().optional(),
      autoSuggestFollowups: z.boolean().optional(),
      saveConversationHistory: z.boolean().optional(),
      emailNotifications: z.boolean().optional(),
      conversationResponses: z.boolean().optional(),
      documentProcessingNotifications: z.boolean().optional(),
      productUpdates: z.boolean().optional(),
      securityAlerts: z.boolean().optional(),
      allowDataTraining: z.boolean().optional(),
      activityTracking: z.boolean().optional(),
      codeSyntaxHighlighting: z.boolean().optional(),
      fontSize: z.enum(['small', 'medium', 'large']).optional(),
    }).parse(req.body);

    if (data.defaultAgentId) {
      await getActiveAgent(data.defaultAgentId);
    }

    const settings = await prisma.userSettings.upsert({
      where: { userId: req.userId! },
      update: data,
      create: { userId: req.userId!, ...data },
    });

    res.json({ settings });
  } catch (error) {
    next(error);
  }
});
