# Neura V5 — Phase 11: RAG / Knowledge Base

Phase 11 adds the document-intelligence pipeline on top of Phase 10.

## Implemented

- PDF, DOCX and TXT text extraction
- Chunking with configurable size/overlap
- Gemini embeddings using `GEMINI_EMBEDDING_MODEL`
- PostgreSQL `pgvector` storage
- HNSW cosine index
- Per-user semantic search
- Automatic RAG retrieval during chat
- Source metadata emitted through SSE
- Citation instructions injected into the agent context
- Document re-index endpoint
- Document collections (create, list, add/remove documents, delete)
- Processing/error state updates
- Graceful fallback: chat continues if RAG indexing/search is unavailable

Images remain stored by Phase 10 but are not semantically indexed because OCR is outside this implementation boundary.

## Database

Phase 11 adds:

- `vector` PostgreSQL extension
- `document_chunks` table with `vector(768)` embeddings
- HNSW cosine index
- `DocumentCollection`
- `DocumentCollectionItem`

Run the migration after installing dependencies:

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
```

If the database is a fresh development database and your existing schema was created with `prisma db push`, keep that workflow consistent with your existing setup; the Phase 11 migration only adds the RAG/collection objects.

## Environment

Add:

```env
GEMINI_API_KEY=...
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
RAG_TOP_K=6
RAG_CHUNK_SIZE=1200
RAG_CHUNK_OVERLAP=200
```

The existing `DOCUMENT_UPLOAD_DIR` and `DOCUMENT_MAX_SIZE_MB` settings remain unchanged.

## API

### Re-index
`POST /api/documents/:id/reindex`

### Collections
`GET /api/collections`
`POST /api/collections`
`POST /api/collections/:id/documents/:documentId`
`DELETE /api/collections/:id/documents/:documentId`
`DELETE /api/collections/:id`

### Chat RAG
The existing chat endpoints automatically retrieve relevant chunks from the authenticated user's knowledge base. Streaming responses emit:

```text
event: sources
data: {"sources":[...]}
```

The source payload includes document ID/name, chunk index, page and similarity score.

## Processing flow

```text
Upload
  ↓
Store original file
  ↓
Processing
  ↓
Extract text
  ↓
Chunk
  ↓
Gemini embedding
  ↓
pgvector
  ↓
Semantic retrieval
  ↓
RAG context
  ↓
Gemini chat
  ↓
Answer + source metadata
```

## Phase 12 compatibility
The existing Memory and UserSettings tables are reused by Phase 12. No database schema change is required for the first memory implementation.
