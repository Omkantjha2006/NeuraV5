import type { Agent, AgentId } from '@/types';

/**
 * Development/mock fallback only. In API mode the runtime agent catalog comes
 * from GET /api/agents, so adding an agent does not require changing chat UI code.
 */
export const DEFAULT_AGENTS: Agent[] = [
  {
    id: 'general', name: 'Neura General', shortName: 'General',
    description: 'General-purpose assistant',
    capabilities: ['General questions', 'Writing', 'Analysis', 'Everyday assistance'],
    color: '#3b82f6', gradient: 'from-blue-400 to-blue-600', icon: 'sparkles',
  },
  {
    id: 'code', name: 'Neura Code', shortName: 'Code',
    description: 'Programming, debugging, code explanation and development.',
    capabilities: ['Code generation', 'Debugging', 'Code explanation', 'Code optimization', 'Programming questions'],
    color: '#06b6d4', gradient: 'from-cyan-400 to-teal-500', icon: 'code',
  },
  {
    id: 'study', name: 'Neura Study', shortName: 'Study',
    description: 'Learning, notes, quizzes, flashcards and exam preparation.',
    capabilities: ['Explain concepts', 'Generate notes', 'MCQs', 'Flashcards', 'Quizzes', 'Exam preparation'],
    color: '#10b981', gradient: 'from-emerald-400 to-green-500', icon: 'graduation-cap',
  },
  {
    id: 'research', name: 'Neura Research', shortName: 'Research',
    description: 'Research, analysis, summarization and source-based work.',
    capabilities: ['Research', 'Summarization', 'Information analysis', 'Source-based answers'],
    color: '#f59e0b', gradient: 'from-amber-400 to-orange-500', icon: 'search',
  },
  {
    id: 'creative', name: 'Neura Creative', shortName: 'Creative',
    description: 'Writing, brainstorming, editing and content generation.',
    capabilities: ['Brainstorming', 'Writing', 'Editing', 'Content generation'],
    color: '#ec4899', gradient: 'from-pink-400 to-rose-500', icon: 'pen-tool',
  },
];


export function getDefaultAgent(id: AgentId): Agent {
  return DEFAULT_AGENTS.find((agent) => agent.id === id) ?? DEFAULT_AGENTS[0];
}
