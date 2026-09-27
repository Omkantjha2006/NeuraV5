import crypto from 'node:crypto';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/http.js';
import { extractDocumentText } from './documentExtractor.js';
import { chunkText } from './chunking.js';
import { embedText, vectorLiteral } from './embeddings.js';

export type RagSource = {
  id: string;
  documentId: string;
  documentName: string;
  chunkIndex: number;
  page: number | null;
  content: string;
  score: number;
};

export async function indexDocument(documentId: string, userId: string) {
  const document = await prisma.document.findFirst({ where: { id: documentId, userId } });
  if (!document || !document.storageKey) throw new AppError(404, 'Document not found.', 'NOT_FOUND');

  try {
    const extracted = await extractDocumentText(document.storageKey, document.mimeType);
    if (!extracted.text.trim()) {
      await prisma.document.update({ where: { id: documentId }, data: { status: 'ready', pages: extracted.pages ?? null, error: 'No text could be extracted; semantic indexing skipped.' } });
      return { chunks: 0 };
    }

    const chunks = chunkText(extracted.text, env.RAG_CHUNK_SIZE, env.RAG_CHUNK_OVERLAP);
    await prisma.$executeRaw`DELETE FROM "document_chunks" WHERE "document_id" = ${documentId}::uuid`;

    for (const chunk of chunks) {
      const embedding = await embedText(chunk.content);
      const id = crypto.randomUUID();
      const vector = vectorLiteral(embedding);
      await prisma.$executeRaw`
        INSERT INTO "document_chunks" ("id","document_id","chunk_index","content","page","token_count","embedding")
        VALUES (${id}::uuid, ${documentId}::uuid, ${chunk.index}, ${chunk.content}, ${chunk.page ?? null}, ${chunk.tokenCount}, ${vector}::vector)
      `;
    }

    await prisma.document.update({ where: { id: documentId }, data: { status: 'ready', pages: extracted.pages ?? null, error: null } });
    return { chunks: chunks.length };
  } catch (error) {
    await prisma.document.update({ where: { id: documentId }, data: { status: 'error', error: error instanceof Error ? error.message : 'Document indexing failed.' } }).catch(() => undefined);
    throw error;
  }
}

export async function searchKnowledge(userId: string, query: string, topK = env.RAG_TOP_K): Promise<RagSource[]> {
  // Skip the embedding call entirely for users with no indexed documents —
  // otherwise every chat message pays for one embedding request even when
  // there's nothing to retrieve against.
  const hasReadyDocument = await prisma.document.findFirst({
    where: { userId, status: 'ready' },
    select: { id: true },
  });
  if (!hasReadyDocument) return [];

  const embedding = await embedText(query);
  const vector = vectorLiteral(embedding);
  const rows = await prisma.$queryRaw<RagSource[]>`
    SELECT dc."id" as "id", dc."document_id" as "documentId", d."name" as "documentName",
           dc."chunk_index" as "chunkIndex", dc."page" as "page", dc."content" as "content",
           1 - (dc."embedding" <=> ${vector}::vector) as "score"
    FROM "document_chunks" dc
    JOIN "Document" d ON d."id" = dc."document_id"
    WHERE d."userId" = ${userId}::uuid AND d."status" = 'ready'
    ORDER BY dc."embedding" <=> ${vector}::vector
    LIMIT ${topK}
  `;
  return rows.map((r) => ({ ...r, score: Number(r.score) }));
}

export function buildRagContext(sources: RagSource[]) {
  if (!sources.length) return '';
  return `

KNOWLEDGE BASE CONTEXT
Use the following retrieved passages when relevant. Cite factual claims from them using [Source: filename, chunk N]. If the context does not contain the answer, say so rather than inventing it.

${sources.map((s, i) => `[${i + 1}] Source: ${s.documentName}, chunk ${s.chunkIndex}${s.page ? `, page ${s.page}` : ''}
${s.content}`).join('\n\n')}`;
}

export async function reindexUserDocument(documentId: string, userId: string) {
  await prisma.document.updateMany({ where: { id: documentId, userId }, data: { status: 'processing', error: null } });
  return indexDocument(documentId, userId);
}
