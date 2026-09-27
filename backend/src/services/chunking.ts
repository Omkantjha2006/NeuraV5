export type TextChunk = { index: number; content: string; page?: number; tokenCount: number };

function normalize(text: string) {
  return text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

export function chunkText(text: string, size: number, overlap: number): TextChunk[] {
  const clean = normalize(text);
  if (!clean) return [];
  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < clean.length) {
    let end = Math.min(clean.length, start + size);
    if (end < clean.length) {
      const boundary = Math.max(clean.lastIndexOf('\n', end), clean.lastIndexOf('. ', end), clean.lastIndexOf(' ', end));
      if (boundary > start + Math.floor(size * 0.55)) end = boundary + 1;
    }
    const content = clean.slice(start, end).trim();
    if (content) chunks.push({ index, content, tokenCount: Math.ceil(content.length / 4) });
    if (end >= clean.length) break;
    start = Math.max(0, end - overlap);
    index += 1;
  }
  return chunks;
}
