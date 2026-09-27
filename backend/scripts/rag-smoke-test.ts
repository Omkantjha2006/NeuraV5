/**
 * Phase 11 smoke-test helper.
 * Requires DATABASE_URL, GEMINI_API_KEY and an existing authenticated user/document.
 * It verifies the pgvector extension/table and can be run with:
 *   npm run rag:smoke
 */
import { prisma } from '../src/config/prisma.js';

async function main() {
  const extension = await prisma.$queryRaw<Array<{ extname: string }>>`
    SELECT extname FROM pg_extension WHERE extname = 'vector'
  `;
  if (!extension.length) throw new Error('pgvector extension is not installed.');

  const table = await prisma.$queryRaw<Array<{ relname: string }>>`
    SELECT relname FROM pg_class WHERE relname = 'document_chunks'
  `;
  if (!table.length) throw new Error('document_chunks table is missing.');

  const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
    SELECT indexname FROM pg_indexes WHERE tablename = 'document_chunks'
  `;

  console.log(JSON.stringify({
    pgvector: true,
    documentChunks: true,
    indexes: indexes.map((item) => item.indexname),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
