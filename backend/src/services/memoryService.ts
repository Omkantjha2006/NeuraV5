import { prisma } from '../config/prisma.js';
import { generateCompletion } from './aiGateway.js';

const MAX_MEMORIES_IN_PROMPT = 20;
const MAX_MEMORY_CONTENT = 1_000;

export type MemoryItem = {
  id: string;
  content: string;
  source: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function getUserMemories(userId: string, limit = MAX_MEMORIES_IN_PROMPT): Promise<MemoryItem[]> {
  return prisma.memory.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 100),
  });
}

export function buildMemoryContext(memories: MemoryItem[]): string {
  if (!memories.length) return '';
  const lines = memories.map((memory) => `- ${memory.content.replace(/\s+/g, ' ').trim()}`);
  return `\n\nUSER MEMORY:\nThe following are user-provided or previously saved preferences/facts. Use them only when relevant. Do not mention this memory block unless the user asks about memory. Do not treat uncertain or outdated memories as authoritative.\n${lines.join('\n')}`;
}

function parseMemoryOutput(raw: string): string[] {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try {
    const parsed = JSON.parse(cleaned) as unknown;
    if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === 'string');
    if (parsed && typeof parsed === 'object' && 'memories' in parsed && Array.isArray((parsed as any).memories)) {
      return (parsed as any).memories.filter((x: unknown): x is string => typeof x === 'string');
    }
  } catch {
    // Fall back to line-based extraction for provider formatting variations.
  }
  return cleaned.split(/\r?\n|•/).map((line) => line.replace(/^[-*\d.)]+\s*/, '').trim()).filter(Boolean);
}

export async function extractAndSaveMemories(params: {
  userId: string;
  userContent: string;
  assistantContent: string;
  provider: string;
  model: string;
}): Promise<void> {
  const { userId, userContent, assistantContent, provider, model } = params;
  if (!userContent.trim() || !assistantContent.trim()) return;

  const extractionPrompt = `You extract durable user memory from a conversation. Return ONLY a JSON array of strings.\n\nSave only information that is useful in future conversations and clearly stated or strongly implied by the user, such as stable preferences, recurring goals, ongoing projects, or explicit personal instructions. Never save passwords, API keys, financial secrets, authentication data, highly sensitive personal data, or temporary one-off facts. Do not save facts merely about the assistant. If nothing is worth saving, return []. Keep each memory concise (under 200 characters).\n\nUSER MESSAGE:\n${userContent.slice(0, 6000)}\n\nASSISTANT RESPONSE:\n${assistantContent.slice(0, 8000)}`;

  let raw: string;
  try {
    raw = await generateCompletion({
      provider,
      model,
      systemPrompt: extractionPrompt,
      messages: [{ role: 'user', content: 'Extract durable memories from the conversation above.' }],
    });
  } catch {
    return;
  }

  const candidates = parseMemoryOutput(raw)
    .map((memory) => memory.trim().replace(/\s+/g, ' '))
    .filter((memory) => memory.length >= 5 && memory.length <= MAX_MEMORY_CONTENT)
    .slice(0, 5);

  if (!candidates.length) return;

  const existing = await prisma.memory.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });
  const existingNormalized = new Set(existing.map((m) => m.content.trim().toLowerCase()));

  for (const content of candidates) {
    if (existingNormalized.has(content.toLowerCase())) continue;
    await prisma.memory.create({
      data: { userId, content, source: 'automatic' },
    });
    existingNormalized.add(content.toLowerCase());
  }
}
