import { prisma } from '../config/prisma.js';

export async function getAnalytics(userId: string) {
  const [conversations, messages, documents, memories, tasks, prompts, recent, agents] = await Promise.all([
    prisma.conversation.count({ where: { userId } }),
    prisma.message.count({ where: { conversation: { userId } } }),
    prisma.document.count({ where: { userId } }),
    prisma.memory.count({ where: { userId } }),
    prisma.productivityTask.count({ where: { userId } }),
    prisma.savedPrompt.count({ where: { userId } }),
    prisma.conversation.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 30, select: { updatedAt: true } }),
    prisma.conversation.groupBy({ by: ['agentId'], where: { userId }, _count: { _all: true }, orderBy: { _count: { agentId: 'desc' } }, take: 5 }),
  ]);
  const dailyMap = new Map<string, number>();
  for (const item of recent) {
    const day = item.updatedAt.toISOString().slice(0,10);
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);
  }
  return {
    totals: { conversations, messages, documents, memories, tasks, prompts },
    conversationsByDay: [...dailyMap.entries()].map(([date,count])=>({date,count})).sort((a,b)=>a.date.localeCompare(b.date)),
    mostUsedAgents: agents.map(a=>({ agentId:a.agentId, conversations:a._count._all })),
  };
}
