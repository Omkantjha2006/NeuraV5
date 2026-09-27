import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const agents = [
  {
    id: 'general',
    name: 'Neura General',
    shortName: 'General',
    description: 'General-purpose assistant',
    systemPrompt: 'You are Neura General, a helpful general-purpose AI assistant. Give clear, accurate, practical answers and adapt to the user’s requested level of detail.',
    provider: 'google',
    model: 'gemini-2.5-flash',
    capabilities: ['General questions', 'Writing', 'Analysis', 'Everyday assistance'],
    color: '#3b82f6',
    gradient: 'from-blue-400 to-blue-600',
    icon: 'sparkles',
  },
  {
    id: 'code',
    name: 'Neura Code',
    shortName: 'Code',
    description: 'Programming, debugging, code explanation and development.',
    systemPrompt: 'You are Neura Code, a programming and development specialist. Produce correct, maintainable code, explain technical decisions, debug systematically, and prefer practical solutions.',
    provider: 'google',
    model: 'gemini-2.5-flash',
    capabilities: ['Code generation', 'Debugging', 'Code explanation', 'Code optimization', 'Programming questions'],
    color: '#06b6d4',
    gradient: 'from-cyan-400 to-teal-500',
    icon: 'code',
  },
  {
    id: 'study',
    name: 'Neura Study',
    shortName: 'Study',
    description: 'Learning, notes, quizzes, flashcards and exam preparation.',
    systemPrompt: 'You are Neura Study, a learning and exam-preparation specialist. Explain concepts step by step, use simple language when useful, create structured notes and practice questions, and focus on understanding.',
    provider: 'google',
    model: 'gemini-2.5-flash',
    capabilities: ['Explain concepts', 'Generate notes', 'MCQs', 'Flashcards', 'Quizzes', 'Exam preparation'],
    color: '#10b981',
    gradient: 'from-emerald-400 to-green-500',
    icon: 'graduation-cap',
  },
  {
    id: 'research',
    name: 'Neura Research',
    shortName: 'Research',
    description: 'Research, analysis, summarization and source-based work.',
    systemPrompt: 'You are Neura Research, a research and analysis specialist. Separate facts from interpretation, structure evidence clearly, summarize accurately, and identify uncertainty when sources or information are incomplete.',
    provider: 'google',
    model: 'gemini-2.5-flash',
    capabilities: ['Research', 'Summarization', 'Information analysis', 'Source-based answers'],
    color: '#f59e0b',
    gradient: 'from-amber-400 to-orange-500',
    icon: 'search',
  },
  {
    id: 'creative',
    name: 'Neura Creative',
    shortName: 'Creative',
    description: 'Writing, brainstorming, editing and content generation.',
    systemPrompt: 'You are Neura Creative, a writing and brainstorming specialist. Generate original, useful ideas and polished writing while following the requested audience, format, tone, and constraints.',
    provider: 'google',
    model: 'gemini-2.5-flash',
    capabilities: ['Brainstorming', 'Writing', 'Editing', 'Content generation'],
    color: '#ec4899',
    gradient: 'from-pink-400 to-rose-500',
    icon: 'pen-tool',
  },
];

async function main() {
  await prisma.$transaction(async (tx) => {
    for (const agent of agents) {
      await tx.agent.upsert({
        where: { id: agent.id },
        update: agent,
        create: agent,
      });
    }
  });

  const count = await prisma.agent.count({ where: { id: { in: agents.map((agent) => agent.id) } } });
  if (count !== agents.length) throw new Error(`Expected ${agents.length} agents after seed, found ${count}`);
  console.log(`Seeded and verified ${count} agents.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
