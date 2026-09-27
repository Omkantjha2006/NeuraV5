import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../utils/http.js';

export const memoryRouter = Router();
memoryRouter.use(requireAuth);

const memorySchema = z.object({
  content: z.string().trim().min(1).max(10_000),
  source: z.string().trim().max(100).optional(),
});

memoryRouter.get('/', async (req, res, next) => {
  try {
    const memories = await prisma.memory.findMany({
      where: { userId: req.userId! },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ memories });
  } catch (error) {
    next(error);
  }
});

memoryRouter.post('/', async (req, res, next) => {
  try {
    const data = memorySchema.parse(req.body);
    const duplicate = await prisma.memory.findFirst({
      where: { userId: req.userId!, content: data.content },
      select: { id: true },
    });
    if (duplicate) throw new AppError(409, 'This memory already exists.', 'MEMORY_EXISTS');

    const memory = await prisma.memory.create({
      data: { ...data, source: data.source ?? 'manual', userId: req.userId! },
    });
    res.status(201).json({ memory });
  } catch (error) {
    next(error);
  }
});

memoryRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const data = z.object({ content: z.string().trim().min(1).max(10_000) }).parse(req.body);
    const memory = await prisma.memory.findFirst({ where: { id, userId: req.userId! }, select: { id: true } });
    if (!memory) throw new AppError(404, 'Memory not found', 'NOT_FOUND');

    const updated = await prisma.memory.update({ where: { id }, data: { content: data.content, source: 'manual' } });
    res.json({ memory: updated });
  } catch (error) {
    next(error);
  }
});

memoryRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const memory = await prisma.memory.findFirst({ where: { id, userId: req.userId! }, select: { id: true } });
    if (!memory) throw new AppError(404, 'Memory not found', 'NOT_FOUND');
    await prisma.memory.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

memoryRouter.delete('/', async (req, res, next) => {
  try {
    await prisma.memory.deleteMany({ where: { userId: req.userId! } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
