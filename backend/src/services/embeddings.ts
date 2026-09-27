import { env } from '../config/env.js';
import { AppError } from '../utils/http.js';

type EmbedResponse = { embedding?: { values?: number[] }; error?: { message?: string } };

export async function embedText(text: string): Promise<number[]> {
  if (!env.GEMINI_API_KEY) throw new AppError(503, 'Gemini API key is not configured on the server.', 'AI_NOT_CONFIGURED');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GEMINI_EMBEDDING_MODEL)}:embedContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: `models/${env.GEMINI_EMBEDDING_MODEL}`, content: { parts: [{ text }] }, outputDimensionality: 768 }),
  });
  const payload = await response.json().catch(() => null) as EmbedResponse | null;
  if (!response.ok || !payload?.embedding?.values?.length) {
    throw new AppError(502, payload?.error?.message ?? 'Embedding generation failed.', 'EMBEDDING_FAILED');
  }
  return payload.embedding.values;
}

export function vectorLiteral(values: number[]) {
  return `[${values.map((v) => Number(v).toFixed(8)).join(',')}]`;
}
