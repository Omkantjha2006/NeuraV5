import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../utils/http.js';
import { getActiveAgent } from '../services/agentService.js';

export const conversationsRouter = Router();
conversationsRouter.use(requireAuth);

conversationsRouter.get('/search', async (req, res, next) => {
  try {
    const q = z.string().trim().min(1).max(200).parse(String(req.query.q ?? ''));
    const conversations = await prisma.conversation.findMany({
      where: {
        userId: req.userId!,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { messages: { some: { content: { contains: q, mode: 'insensitive' } } } },
        ],
      },
      include: {
        agent: true,
        messages: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
      take: 100,
    });
    res.json({ conversations });
  } catch (error) {
    next(error);
  }
});

const createSchema = z.object({
  agentId: z.string().min(1),
  title: z.string().trim().min(1).max(200).optional(),
});

conversationsRouter.get('/', async (req, res, next) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId: req.userId! },
      include: {
        agent: true,
        messages: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ conversations });
  } catch (error) {
    next(error);
  }
});

conversationsRouter.post('/', async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    await getActiveAgent(data.agentId);

    const conversation = await prisma.conversation.create({
      data: {
        userId: req.userId!,
        agentId: data.agentId,
        title: data.title ?? 'New Conversation',
      },
      include: { agent: true, messages: true },
    });

    res.status(201).json({ conversation });
  } catch (error) {
    next(error);
  }
});

conversationsRouter.patch('/:id', async (req, res, next) => {
  try {
    const data = z.object({
      title: z.string().trim().min(1).max(200).optional(),
      pinned: z.boolean().optional(),
      archived: z.boolean().optional(),
      agentId: z.string().optional(),
    }).parse(req.body);

    const existing = await prisma.conversation.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!existing) throw new AppError(404, 'Conversation not found', 'NOT_FOUND');

    if (data.agentId) {
      await getActiveAgent(data.agentId);
    }

    const conversation = await prisma.conversation.update({
      where: { id: existing.id },
      data,
      include: { agent: true, messages: { orderBy: { createdAt: 'asc' } } },
    });

    res.json({ conversation });
  } catch (error) {
    next(error);
  }
});

conversationsRouter.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.conversation.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      select: { id: true },
    });
    if (!existing) throw new AppError(404, 'Conversation not found', 'NOT_FOUND');

    await prisma.conversation.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
