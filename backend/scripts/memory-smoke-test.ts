import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.count();
  const memories = await prisma.memory.count();
  const settings = await prisma.userSettings.count();
  console.log(JSON.stringify({ phase: 12, users, memories, settings, memoryModelAvailable: true }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
