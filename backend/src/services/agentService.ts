import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/http.js';

export const agentPublicSelect = {
  id: true,
  name: true,
  shortName: true,
  description: true,
  capabilities: true,
  color: true,
  gradient: true,
  icon: true,
  isActive: true,
  provider: true,
  model: true,
} as const;

export type PublicAgent = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  capabilities: unknown;
  color: string;
  gradient: string;
  icon: string;
  isActive: boolean;
  provider: string;
  model: string;
};

export async function listActiveAgents(): Promise<PublicAgent[]> {
  return prisma.agent.findMany({
    where: { isActive: true },
    select: agentPublicSelect,
    orderBy: { id: 'asc' },
  });
}

export async function getActiveAgent(id: string) {
  const agent = await prisma.agent.findFirst({
    where: { id, isActive: true },
  });

  if (!agent) {
    throw new AppError(400, `Unknown or inactive agent: ${id}`, 'INVALID_AGENT');
  }

  return agent;
}

export async function getAgentConfig(id: string) {
  const agent = await getActiveAgent(id);
  return {
    id: agent.id,
    name: agent.name,
    systemPrompt: agent.systemPrompt,
    provider: agent.provider,
    model: agent.model,
    capabilities: agent.capabilities,
  };
}
