import { prisma } from '../src/config/prisma.js';
import { getActiveAgent, listActiveAgents } from '../src/services/agentService.js';

const expected = ['general', 'code', 'study', 'research', 'creative'];

async function main() {
  const agents = await listActiveAgents();
  const ids = agents.map((agent) => agent.id);

  for (const id of expected) {
    if (!ids.includes(id)) throw new Error(`Missing active agent: ${id}`);
  }

  if (agents.length < expected.length) {
    throw new Error(`Expected at least ${expected.length} active agents, found ${agents.length}`);
  }

  const general = await getActiveAgent('general');
  if (!general.systemPrompt || !general.provider || !general.model) {
    throw new Error('General agent is missing systemPrompt/provider/model configuration');
  }

  console.log(`Phase 6 agent smoke test passed: ${agents.length} active agents configured.`);
  console.log(agents.map((agent) => `- ${agent.id}: ${agent.name}`).join('\n'));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
