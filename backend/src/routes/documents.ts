import { Router } from 'express';
import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../utils/http.js';
import { getActiveAgent } from '../services/agentService.js';
import { indexDocument, reindexUserDocument } from '../services/ragService.js';

export const documentsRouter = Router();
documentsRouter.use(requireAuth);

const uploadSchema = z.object({
  name: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(150),
  contentBase64: z.string().min(1),
  agentId: z.string().min(1).optional(),
});

const searchSchema = z.string().trim().max(200).optional();

const SUPPORTED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

const EXTENSION_TO_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
};

function uploadRoot() {
  return path.resolve(process.cwd(), env.DOCUMENT_UPLOAD_DIR);
}

function safeFilename(name: string) {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
  return base || 'document';
}

function extensionFor(name: string) {
  return path.extname(name).slice(1).toLowerCase();
}

function validateFile(name: string, mimeType: string, buffer: Buffer) {
  const normalizedMime = mimeType.toLowerCase();
  const ext = extensionFor(name);
  const expectedMime = EXTENSION_TO_MIME[ext];

  if (!SUPPORTED_MIME_TYPES.has(normalizedMime) || !expectedMime || expectedMime !== normalizedMime) {
    throw new AppError(
      400,
      'Unsupported file type. Upload PDF, DOCX, TXT, PNG, JPG, GIF, or WEBP files.',
      'UNSUPPORTED_FILE_TYPE',
    );
  }

  const maxBytes = env.DOCUMENT_MAX_SIZE_MB * 1024 * 1024;
  if (buffer.length > maxBytes) {
    throw new AppError(413, `File exceeds the ${env.DOCUMENT_MAX_SIZE_MB} MB upload limit.`, 'FILE_TOO_LARGE');
  }

  if (buffer.length === 0) {
    throw new AppError(400, 'The uploaded file is empty.', 'EMPTY_FILE');
  }
}

function documentResponse(document: any) {
  return {
    ...document,
    sizeBytes: Number(document.sizeBytes),
  };
}

async function removeStoredFile(storageKey: string | null) {
  if (!storageKey) return;
  const root = uploadRoot();
  const target = path.resolve(root, storageKey);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) return;
  await fs.rm(target, { force: true });
}

documentsRouter.get('/', async (req, res, next) => {
  try {
    const q = searchSchema.parse(req.query.q ? String(req.query.q) : undefined);
    const documents = await prisma.document.findMany({
      where: {
        userId: req.userId!,
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { agent: true },
    });
    res.json({ documents: documents.map(documentResponse) });
  } catch (error) {
    next(error);
  }
});

documentsRouter.post('/upload', async (req, res, next) => {
  try {
    const data = uploadSchema.parse(req.body);
    const buffer = Buffer.from(data.contentBase64, 'base64');
    validateFile(data.name, data.mimeType, buffer);

    let agentId: string | null = null;
    if (data.agentId) {
      const agent = await getActiveAgent(data.agentId);
      agentId = agent.id;
    }

    const documentId = crypto.randomUUID();
    const fileName = `${documentId}-${safeFilename(data.name)}`;
    const userDirectory = path.join(uploadRoot(), req.userId!);
    const filePath = path.join(userDirectory, fileName);
    const storageKey = path.relative(uploadRoot(), filePath).replace(/\\/g, '/');

    const document = await prisma.document.create({
      data: {
        id: documentId,
        name: data.name,
        mimeType: data.mimeType,
        sizeBytes: BigInt(buffer.length),
        storageKey,
        status: 'processing',
        userId: req.userId!,
        agentId,
      },
      include: { agent: true },
    });

    try {
      await fs.mkdir(userDirectory, { recursive: true });
      await fs.writeFile(filePath, buffer, { flag: 'wx' });

      const processing = await prisma.document.update({
        where: { id: document.id },
        data: { status: 'processing', error: null },
        include: { agent: true },
      });

      // Index asynchronously so upload remains responsive. The document stays in
      // "processing" until extraction, chunking, embedding and vector persistence finish.
      void indexDocument(document.id, req.userId!).catch(() => undefined);
      return res.status(201).json({ document: documentResponse(processing) });
    } catch (storageError) {
      await prisma.document.update({
        where: { id: document.id },
        data: { status: 'error', error: storageError instanceof Error ? storageError.message : 'File storage failed.' },
      }).catch(() => undefined);
      await removeStoredFile(storageKey).catch(() => undefined);
      throw new AppError(500, 'The file could not be stored.', 'FILE_STORAGE_ERROR');
    }
  } catch (error) {
    next(error);
  }
});


documentsRouter.post('/:id/reindex', async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const document = await prisma.document.findFirst({ where: { id, userId: req.userId! }, select: { id: true } });
    if (!document) throw new AppError(404, 'Document not found', 'NOT_FOUND');
    void reindexUserDocument(id, req.userId!).catch(() => undefined);
    res.status(202).json({ status: 'processing', documentId: id });
  } catch (error) {
    next(error);
  }
});

documentsRouter.get('/:id/preview', async (req, res, next) => {
  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      select: { id: true, name: true, mimeType: true, storageKey: true, status: true },
    });
    if (!document) throw new AppError(404, 'Document not found', 'NOT_FOUND');
    if (document.status !== 'ready' || !document.storageKey) {
      throw new AppError(409, 'Document is not ready for preview.', 'DOCUMENT_NOT_READY');
    }

    const root = uploadRoot();
    const target = path.resolve(root, document.storageKey);
    if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
      throw new AppError(400, 'Invalid document storage path.', 'INVALID_STORAGE_PATH');
    }

    const file = await fs.readFile(target).catch(() => null);
    if (!file) throw new AppError(404, 'Stored document file not found.', 'FILE_NOT_FOUND');

    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Length', String(file.length));
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename(document.name)}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(file);
  } catch (error) {
    next(error);
  }
});

documentsRouter.delete('/:id', async (req, res, next) => {
  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      select: { id: true, storageKey: true },
    });
    if (!document) throw new AppError(404, 'Document not found', 'NOT_FOUND');

    await prisma.document.delete({ where: { id: document.id } });
    await removeStoredFile(document.storageKey).catch(() => undefined);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
