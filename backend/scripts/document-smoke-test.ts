/**
 * Database + filesystem level smoke test for document upload/preview/delete.
 * Mirrors the checks in src/routes/documents.ts without needing a live HTTP
 * server: user-scoped storage, path-traversal protection, size/type config
 * sanity, and cascade-delete cleanup. Run with: npm run documents:smoke
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/prisma.js';
import { env } from '../src/config/env.js';

function uploadRoot() {
  return path.resolve(process.cwd(), env.DOCUMENT_UPLOAD_DIR);
}

// Same guard as removeStoredFile()/preview in src/routes/documents.ts: a
// resolved path must stay inside the upload root.
function isPathSafe(storageKey: string) {
  const root = uploadRoot();
  const target = path.resolve(root, storageKey);
  return target === root || target.startsWith(`${root}${path.sep}`);
}

async function main() {
  if (!(env.DOCUMENT_MAX_SIZE_MB > 0 && env.DOCUMENT_MAX_SIZE_MB <= 100)) {
    throw new Error(`DOCUMENT_MAX_SIZE_MB is out of the expected 1-100 range: ${env.DOCUMENT_MAX_SIZE_MB}`);
  }

  // Path-traversal guard: a malicious storageKey must be rejected, an honest one must pass.
  if (isPathSafe('../../etc/passwd')) throw new Error('Path-traversal guard failed to reject a traversal attempt.');
  if (!isPathSafe('some-user-id/doc-abc.txt')) throw new Error('Path-traversal guard rejected a legitimate storage key.');

  const email = `documents-smoke-${Date.now()}@example.invalid`;
  const user = await prisma.user.create({
    data: {
      name: 'Documents Smoke Test',
      email,
      passwordHash: await bcrypt.hash('Phase20-Strong-Password!', 12),
      settings: { create: {} },
    },
  });

  const documentId = crypto.randomUUID();
  const fileName = `${documentId}-smoke-test.txt`;
  const userDirectory = path.join(uploadRoot(), user.id);
  const filePath = path.join(userDirectory, fileName);
  const storageKey = path.relative(uploadRoot(), filePath).replace(/\\/g, '/');
  const contents = Buffer.from('Neura documents smoke test file.', 'utf-8');

  try {
    // --- Upload: DB row + user-scoped file on disk, same as POST /api/documents/upload ---
    const document = await prisma.document.create({
      data: {
        id: documentId,
        name: 'smoke-test.txt',
        mimeType: 'text/plain',
        sizeBytes: BigInt(contents.length),
        storageKey,
        status: 'processing',
        userId: user.id,
      },
    });

    await fs.mkdir(userDirectory, { recursive: true });
    await fs.writeFile(filePath, contents, { flag: 'wx' });
    await prisma.document.update({ where: { id: document.id }, data: { status: 'ready' } });

    // --- List: query must be scoped to the owning user ---
    const ownedByUser = await prisma.document.findFirst({ where: { id: documentId, userId: user.id } });
    if (!ownedByUser) throw new Error('Document was not found when queried by its owner.');

    const otherUserId = crypto.randomUUID();
    const notOwnedByOther = await prisma.document.findFirst({ where: { id: documentId, userId: otherUserId } });
    if (notOwnedByOther) throw new Error('Document leaked across a different userId scope.');

    // --- Preview: file on disk must be readable at the stored, validated path ---
    const target = path.resolve(uploadRoot(), storageKey);
    if (!isPathSafe(storageKey)) throw new Error('Stored document storageKey failed the path-traversal guard.');
    const readBack = await fs.readFile(target);
    if (!readBack.equals(contents)) throw new Error('Stored file contents did not round-trip correctly.');

    // --- Delete: row + file removal, same as DELETE /api/documents/:id ---
    await prisma.document.delete({ where: { id: document.id } });
    await fs.rm(target, { force: true });

    const afterDelete = await prisma.document.findUnique({ where: { id: documentId } });
    if (afterDelete) throw new Error('Document row still existed after delete.');
    const fileStillExists = await fs.access(target).then(() => true).catch(() => false);
    if (fileStillExists) throw new Error('Stored file still existed after delete.');

    // --- Cascade delete: a second document should be removed when its user is deleted ---
    const cascadeDoc = await prisma.document.create({
      data: {
        name: 'cascade-check.txt',
        mimeType: 'text/plain',
        sizeBytes: BigInt(contents.length),
        status: 'ready',
        userId: user.id,
      },
    });
    await prisma.user.delete({ where: { id: user.id } });
    const cascaded = await prisma.document.findUnique({ where: { id: cascadeDoc.id } });
    if (cascaded) throw new Error('Document was not cascade-deleted when its owning user was deleted.');

    console.log('Documents smoke test passed: upload, user-scoped access, preview path safety, delete, and cascade-delete all verified.');
  } finally {
    // Best-effort cleanup in case an assertion threw before the normal delete path ran.
    await fs.rm(userDirectory, { recursive: true, force: true }).catch(() => undefined);
    await prisma.document.deleteMany({ where: { userId: user.id } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: user.id } }).catch(() => undefined);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
