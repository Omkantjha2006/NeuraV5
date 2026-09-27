import { prisma } from '../src/config/prisma.js';
import bcrypt from 'bcryptjs';
import { hashToken, randomToken } from '../src/utils/crypto.js';

/** Database-level authentication invariant check; no live HTTP server required. */
async function main() {
  const email = `auth-smoke-${Date.now()}@example.invalid`;
  const password = 'Phase5-Strong-Password!';
  const user = await prisma.user.create({
    data: {
      name: 'Phase 5 Smoke Test',
      email,
      passwordHash: await bcrypt.hash(password, 12),
      settings: { create: {} },
    },
  });

  const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!stored.passwordHash || !(await bcrypt.compare(password, stored.passwordHash))) throw new Error('Password hashing verification failed');
  if (stored.passwordHash === password) throw new Error('Password was stored in plaintext');

  const raw = randomToken();
  const session = await prisma.session.create({
    data: { userId: user.id, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + 60_000) },
  });
  const found = await prisma.session.findUnique({ where: { tokenHash: hashToken(raw) } });
  if (!found || found.userId !== user.id) throw new Error('Session lookup failed');

  await prisma.session.delete({ where: { id: session.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log('Phase 5 auth database smoke test passed.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
