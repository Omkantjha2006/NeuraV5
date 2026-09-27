import fs from 'node:fs/promises';
import path from 'node:path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { env } from '../config/env.js';
import { AppError } from '../utils/http.js';

export type ExtractedDocument = {
  text: string;
  pages?: number;
};

export async function extractDocumentText(storageKey: string, mimeType: string): Promise<ExtractedDocument> {
  const target = path.resolve(process.cwd(), env.DOCUMENT_UPLOAD_DIR, storageKey);
  const buffer = await fs.readFile(target);
  if (mimeType === 'text/plain') return { text: buffer.toString('utf8') };
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value };
  }
  if (mimeType === 'application/pdf') {
    const result = await pdfParse(buffer);
    return { text: result.text, pages: result.numpages };
  }
  if (mimeType.startsWith('image/')) {
    // OCR for images is intentionally delegated to the Gemini vision endpoint in a future
    // extension; image documents remain stored but are not indexed without extracted text.
    return { text: '' };
  }
  throw new AppError(400, 'This document type cannot be indexed.', 'UNSUPPORTED_INDEX_TYPE');
}
