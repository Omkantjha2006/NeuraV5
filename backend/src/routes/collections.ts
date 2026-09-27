import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../utils/http.js';

export const collectionsRouter = Router();
collectionsRouter.use(requireAuth);

collectionsRouter.get('/', async (req, res, next) => {
  try {
    const collections = await prisma.documentCollection.findMany({
      where: { userId: req.userId! },
      include: { documents: { include: { document: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ collections });
  } catch (e) { next(e); }
});

collectionsRouter.post('/', async (req, res, next) => {
  try {
    const data = z.object({ name: z.string().trim().min(1).max(100), description: z.string().trim().max(500).optional() }).parse(req.body);
    const collection = await prisma.documentCollection.create({ data: { ...data, userId: req.userId! } });
    res.status(201).json({ collection });
  } catch (e) { next(e); }
});

collectionsRouter.post('/:id/documents/:documentId', async (req, res, next) => {
  try {
    const collection = await prisma.documentCollection.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    const document = await prisma.document.findFirst({ where: { id: req.params.documentId, userId: req.userId! } });
    if (!collection || !document) throw new AppError(404, 'Collection or document not found.', 'NOT_FOUND');
    await prisma.documentCollectionItem.upsert({
      where: { collectionId_documentId: { collectionId: collection.id, documentId: document.id } },
      update: {},
      create: { collectionId: collection.id, documentId: document.id },
    });
    res.status(204).send();
  } catch (e) { next(e); }
});

collectionsRouter.delete('/:id/documents/:documentId', async (req, res, next) => {
  try {
    const collection = await prisma.documentCollection.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!collection) throw new AppError(404, 'Collection not found.', 'NOT_FOUND');
    await prisma.documentCollectionItem.deleteMany({ where: { collectionId: collection.id, documentId: req.params.documentId } });
    res.status(204).send();
  } catch (e) { next(e); }
});

collectionsRouter.delete('/:id', async (req, res, next) => {
  try {
    const collection = await prisma.documentCollection.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!collection) throw new AppError(404, 'Collection not found.', 'NOT_FOUND');
    await prisma.documentCollection.delete({ where: { id: collection.id } });
    res.status(204).send();
  } catch (e) { next(e); }
});
