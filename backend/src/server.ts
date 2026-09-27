import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { captureException } from './config/sentry.js';

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  captureException(error, { source: 'uncaughtException' });
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  captureException(reason, { source: 'unhandledRejection' });
});

let server: ReturnType<typeof app.listen> | undefined;

async function start() {
  await prisma.$connect();

  server = app.listen(env.PORT, () => {
    console.log(`Neura API running at http://localhost:${env.PORT}`);
  });
}

async function shutdown(signal: string) {
  console.log(`${signal} received. Shutting down Neura API...`);

  if (!server) {
    await prisma.$disconnect();
    return;
  }

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

start().catch(async (error) => {
  console.error('Failed to start Neura API:', error);
  await prisma.$disconnect();
  process.exit(1);
});
