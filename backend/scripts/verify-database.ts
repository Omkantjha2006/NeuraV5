import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

type Row = { name: string };

async function main() {
  console.log('Neura V5 Phase 4 database verification');

  await prisma.$queryRaw`SELECT 1`;
  console.log('✓ PostgreSQL connection');

  const tables = await prisma.$queryRaw<Row[]>`
    SELECT table_name AS name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'User','Agent','OAuthAccount','Session','PasswordResetToken',
        'Conversation','Message','Document','Memory','UserSettings',
        'DocumentCollection','DocumentCollectionItem','ProductivityTask','SavedPrompt','WorkspaceNote','AuditLog','SharedMessage'
      )
    ORDER BY table_name
  `;
  const expectedTableCount = 17;
  if (tables.length !== expectedTableCount) {
    throw new Error(`Expected ${expectedTableCount} application tables, found ${tables.length}`);
  }
  console.log(`✓ Core application tables present (${tables.length}/${expectedTableCount})`);

  const vectorExtension = await prisma.$queryRaw<Row[]>`
    SELECT extname AS name FROM pg_extension WHERE extname = 'vector'
  `;
  if (vectorExtension.length !== 1) throw new Error('Missing PostgreSQL pgvector extension.');
  console.log('✓ pgvector extension present');

  const ragTable = await prisma.$queryRaw<Row[]>`
    SELECT table_name AS name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'document_chunks'
  `;
  if (ragTable.length !== 1) throw new Error('Missing document_chunks RAG table.');
  console.log('✓ RAG document_chunks table present');

  const enums = await prisma.$queryRaw<Row[]>`
    SELECT t.typname AS name
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typnamespace = 'public'::regnamespace
    GROUP BY t.typname
  `;
  const enumNames = new Set(enums.map((row) => row.name));
  for (const name of ['Plan', 'MessageRole', 'DocumentStatus']) {
    if (!enumNames.has(name)) throw new Error(`Missing enum: ${name}`);
  }
  console.log('✓ Required PostgreSQL enums present');

  const indexes = await prisma.$queryRaw<Row[]>`
    SELECT indexname AS name
    FROM pg_indexes
    WHERE schemaname = 'public'
  `;
  const indexNames = new Set(indexes.map((row) => row.name));
  const requiredIndexes = [
    'User_email_key',
    'OAuthAccount_provider_providerAccountId_key',
    'OAuthAccount_userId_provider_key',
    'Session_tokenHash_key',
    'Conversation_userId_updatedAt_idx',
    'Conversation_userId_pinned_idx',
    'Conversation_userId_archived_idx',
    'Conversation_agentId_updatedAt_idx',
    'Message_conversationId_createdAt_idx',
    'Document_userId_createdAt_idx',
    'Document_userId_status_idx',
    'Memory_userId_updatedAt_idx',
    'UserSettings_defaultAgentId_idx',
  ];
  const missingIndexes = requiredIndexes.filter((name) => !indexNames.has(name));
  if (missingIndexes.length) throw new Error(`Missing indexes: ${missingIndexes.join(', ')}`);
  console.log(`✓ Required indexes present (${requiredIndexes.length})`);

  const agents = await prisma.agent.findMany({ select: { id: true }, orderBy: { id: 'asc' } });
  const expectedAgents = ['code', 'creative', 'general', 'research', 'study'];
  if (agents.map((a) => a.id).sort().join(',') !== expectedAgents.join(',')) {
    throw new Error(`Expected seeded agents: ${expectedAgents.join(', ')}`);
  }
  console.log('✓ Five canonical agents are seeded');

  const suffix = crypto.randomUUID();
  const email = `phase4-verification-${suffix}@invalid.local`;

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: 'Phase 4 Verification',
        email,
        settings: { create: { defaultAgentId: 'general' } },
      },
    });

    const conversation = await tx.conversation.create({
      data: { userId: user.id, agentId: 'general' },
    });

    await tx.message.create({
      data: {
        conversationId: conversation.id,
        agentId: 'general',
        role: 'user',
        content: 'Phase 4 relationship verification',
      },
    });

    await tx.document.create({
      data: {
        userId: user.id,
        agentId: 'study',
        name: 'phase4-verification.txt',
        mimeType: 'text/plain',
        sizeBytes: 32n,
      },
    });

    await tx.memory.create({
      data: { userId: user.id, content: 'Temporary Phase 4 verification memory' },
    });

    await tx.session.create({
      data: {
        userId: user.id,
        tokenHash: `phase4-${suffix}`,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    await tx.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: `phase4-reset-${suffix}`,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    await tx.user.delete({ where: { id: user.id } });

    const [settings, conversations, messages, documents, memories, sessions, resets] =
      await Promise.all([
        tx.userSettings.count({ where: { userId: user.id } }),
        tx.conversation.count({ where: { userId: user.id } }),
        tx.message.count({ where: { conversationId: conversation.id } }),
        tx.document.count({ where: { userId: user.id } }),
        tx.memory.count({ where: { userId: user.id } }),
        tx.session.count({ where: { userId: user.id } }),
        tx.passwordResetToken.count({ where: { userId: user.id } }),
      ]);

    if ([settings, conversations, messages, documents, memories, sessions, resets].some((count) => count !== 0)) {
      throw new Error(
        `Cascade delete failed: settings=${settings}, conversations=${conversations}, messages=${messages}, documents=${documents}, memories=${memories}, sessions=${sessions}, resets=${resets}`,
      );
    }

    // Force rollback so the verification leaves no data behind.
    throw new Error('__PHASE4_ROLLBACK__');
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message === '__PHASE4_ROLLBACK__') return;
    throw error;
  });

  console.log('✓ Relationship + cascade-delete verification passed');
  console.log('✓ Verification transaction rolled back; no test data was retained');
  console.log('Phase 4 database verification complete.');
}

main()
  .catch((error) => {
    console.error('✗ Database verification failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
