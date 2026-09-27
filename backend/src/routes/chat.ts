import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../utils/http.js';
import { getActiveAgent } from '../services/agentService.js';
import { streamConversationResponse, resolveConversationTitle } from './messages.js';

export const chatRouter = Router();
chatRouter.use(requireAuth);

const webOptionsSchema = z.object({
  maxResults: z.coerce.number().int().min(1).max(20).optional(),
  searchDepth: z.enum(['basic', 'advanced', 'fast', 'ultra-fast']).optional(),
  topic: z.enum(['general', 'news', 'finance']).optional(),
  timeRange: z.enum(['day', 'week', 'month', 'year']).optional(),
  includeDomains: z.array(z.string().min(1).max(100)).max(20).optional(),
  excludeDomains: z.array(z.string().min(1).max(100)).max(20).optional(),
});

const chatSchema = z.object({
  conversationId: z.string().uuid().optional(),
  content: z.string().trim().min(1).max(100_000),
  agentId: z.string().min(1),
  webResearch: z.boolean().optional().default(false),
  webOptions: webOptionsSchema.optional(),
});

chatRouter.post('/', async (req, res, next) => {
  try {
    const data = chatSchema.parse(req.body);

    let conversationId = data.conversationId;
    if (!conversationId) {
      const [agent, settings] = await Promise.all([
        getActiveAgent(data.agentId),
        prisma.userSettings.findUnique({ where: { userId: req.userId! } }),
      ]);
      const historyEnabled = settings?.saveConversationHistory ?? true;
      const conversation = await prisma.conversation.create({
        data: {
          userId: req.userId!,
          agentId: agent.id,
          title: resolveConversationTitle(historyEnabled, data.content),
        },
      });
      conversationId = conversation.id;
    } else {
      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId: req.userId! },
        select: { id: true },
      });
      if (!conversation) throw new AppError(404, 'Conversation not found', 'NOT_FOUND');
    }

    await streamConversationResponse(
      req,
      res,
      conversationId!,
      data.agentId,
      data.content,
      false,
      data.webResearch,
      data.webOptions,
    );
  } catch (error) {
    if (!res.headersSent) next(error);
    else res.end();
  }
});

chatRouter.post('/retry', async (req, res, next) => {
  try {
    const data = z.object({ conversationId: z.string().uuid() }).parse(req.body);
    const conversation = await prisma.conversation.findFirst({
      where: { id: data.conversationId, userId: req.userId! },
      select: { id: true },
    });
    if (!conversation) throw new AppError(404, 'Conversation not found', 'NOT_FOUND');
    await streamConversationResponse(req, res, data.conversationId, '', null, true);
  } catch (error) {
    if (!res.headersSent) next(error);
    else res.end();
  }
});

chatRouter.post('/regenerate', async (req, res, next) => {
  try {
    const data = z.object({ conversationId: z.string().uuid() }).parse(req.body);
    const conversation = await prisma.conversation.findFirst({
      where: { id: data.conversationId, userId: req.userId! },
      select: { id: true },
    });
    if (!conversation) throw new AppError(404, 'Conversation not found', 'NOT_FOUND');

    await streamConversationResponse(req, res, data.conversationId, '', null, true);
  } catch (error) {
    if (!res.headersSent) next(error);
    else res.end();
  }
});
