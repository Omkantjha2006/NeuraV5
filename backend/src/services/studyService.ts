import { AppError } from '../utils/http.js';
import { generateCompletion } from './aiGateway.js';
import { getAgentConfig } from './agentService.js';

export const STUDY_MODES = [
  'notes',
  'explain',
  'mcq',
  'flashcards',
  'quiz',
  'study-plan',
  'exam',
  'solve',
  'revision',
] as const;

export type StudyMode = typeof STUDY_MODES[number];

const modeInstructions: Record<StudyMode, string> = {
  notes: 'Create concise, exam-ready notes with headings, definitions, key points, examples, and a short quick-revision section.',
  explain: 'Explain the concept step by step. Start with a simple explanation, then build to the technical/deeper explanation. Include an example and common mistakes.',
  mcq: 'Create multiple-choice questions. Each question must have four options, the correct answer, and a brief explanation. Mix easy, medium, and difficult questions.',
  flashcards: 'Create flashcards in Q/A format. Keep each answer focused on one fact or concept and include enough cards to cover the important material.',
  quiz: 'Create an interactive-style quiz with questions first and an answer key at the end. Include a mix of conceptual and application questions.',
  'study-plan': 'Create a realistic study plan based on the available time, topic, current level, and exam date if supplied. Break it into sessions with goals, practice, and revision.',
  exam: 'Create an exam simulation. Include a balanced paper, marks/time guidance, and an answer key or marking scheme after the questions.',
  solve: 'Solve the supplied question accurately and step by step. Show the method, reasoning, formulas or code where appropriate, then give a concise final answer.',
  revision: 'Create a high-yield revision sheet: key definitions, formulas/facts, likely question areas, common traps, and a rapid self-test.',
};

function buildPrompt(mode: StudyMode, topic: string, context?: string) {
  return `You are Neura Study, a specialized learning and exam-preparation assistant.

Study mode: ${mode}
Task requirements: ${modeInstructions[mode]}

Rules:
- Stay focused on the supplied topic/question.
- Do not invent facts when the user provides source material; clearly flag missing information.
- Use clear Markdown structure.
- Match the learner's requested level and exam context.
- For exam preparation, prioritize accurate keywords and concepts over unnecessary verbosity.
- For MCQs/quizzes, do not reveal answers immediately unless the mode explicitly requires it.

TOPIC / QUESTION:
${topic}

ADDITIONAL CONTEXT:
${context?.trim() || 'None supplied.'}`;
}

export async function runStudyTask(input: {
  mode: StudyMode;
  topic: string;
  context?: string;
  agentId?: string;
}) {
  if (!input.topic.trim()) throw new AppError(400, 'Topic or question is required.', 'INVALID_STUDY_TOPIC');

  const agent = await getAgentConfig(input.agentId || 'study');
  const prompt = buildPrompt(input.mode, input.topic, input.context);
  const result = await generateCompletion({
    provider: agent.provider,
    model: agent.model,
    systemPrompt: `${agent.systemPrompt}\n\n${prompt}`,
    messages: [{ role: 'user', content: input.topic.trim() }],
    temperature: input.mode === 'solve' || input.mode === 'exam' ? 0.35 : 0.65,
  });

  return {
    mode: input.mode,
    topic: input.topic.trim(),
    result,
    agentId: agent.id,
    provider: agent.provider,
    model: agent.model,
  };
}
