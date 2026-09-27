# Neura V5 — Phase 14: Web Research

## Goal

Give Neura a controlled, citation-aware live web research capability without coupling the chat pipeline to a search vendor.

## Implemented

- Tavily-backed web search service with a small provider boundary.
- Authenticated `/api/research/search` endpoint for raw source discovery.
- Authenticated `/api/research` endpoint for AI-synthesized research briefs.
- Web research toggle in the main chat composer.
- Chat requests can search the live web before generation.
- Current factual claims are instructed to use `[Web N]` citations.
- Retrieved web sources are persisted as assistant-message metadata.
- Source cards are displayed below completed research responses.
- Search controls for:
  - maximum results
  - search depth
  - topic (`general`, `news`, `finance`)
  - time range
  - included domains
  - excluded domains
- Request timeout and input validation.
- Retrieved pages are explicitly treated as untrusted reference material to reduce prompt-injection risk.
- Existing private document RAG and user memory remain available alongside web research.
- Phase 14 adds one Prisma migration for message metadata.

## Architecture

```text
React Chat
   |
   | webResearch=true
   v
Node / Express
   |
   +--> Web Research Service
   |       |
   |       +--> Tavily Search
   |       |
   |       +--> normalized WebSource[]
   |
   +--> Private RAG
   |
   +--> User Memory
   |
   v
AI Gateway
   |
   +--> Gemini / OpenAI
   |
   v
Answer with [Web N] citations
   |
   +--> Message.metadata.webSources
   |
   v
React source cards
```

## Environment

```env
TAVILY_API_KEY=
TAVILY_API_BASE_URL=https://api.tavily.com
WEB_SEARCH_MAX_RESULTS=8
WEB_SEARCH_DEPTH=basic
WEB_SEARCH_TIMEOUT_MS=15000
```

`TAVILY_API_KEY` is optional for development because the current Tavily JavaScript tooling supports keyless search with shared limits. A server-side API key should be configured for predictable production usage.

## API

### `POST /api/research/search`

Example:

```json
{
  "query": "latest PostgreSQL 18 features",
  "maxResults": 8,
  "searchDepth": "advanced",
  "topic": "general",
  "timeRange": "month"
}
```

Returns normalized sources:

```json
{
  "query": "latest PostgreSQL 18 features",
  "sources": [
    {
      "id": "web-1",
      "title": "Example source",
      "url": "https://example.com",
      "snippet": "Retrieved source text...",
      "score": 0.91,
      "publishedAt": "2026-09-20",
      "domain": "example.com"
    }
  ]
}
```

### `POST /api/research`

Searches first, then asks the configured research agent to synthesize the sources.

Response:

```json
{
  "query": "latest PostgreSQL 18 features",
  "report": ".... [Web 1] ....",
  "sources": [],
  "provider": "google",
  "model": "gemini-2.5-flash"
}
```

## Chat integration

The main chat request now accepts:

```json
{
  "conversationId": "uuid",
  "content": "What changed in React recently?",
  "agentId": "research",
  "webResearch": true,
  "webOptions": {
    "searchDepth": "advanced",
    "timeRange": "month"
  }
}
```

When enabled:

1. Neura searches the web.
2. Results are normalized.
3. Search context is added to the agent prompt.
4. The model is instructed to cite claims as `[Web 1]`, `[Web 2]`, etc.
5. Source metadata is stored with the assistant message.
6. The frontend renders clickable source cards.

Regeneration reuses the web-research setting saved on the last user message.

## Database

Phase 14 adds:

```text
Message.metadata JSONB NULL
```

This stores web sources without creating a second source table.

Migration:

```text
20260925140000_phase14_web_research
```

Run:

```bash
npx prisma migrate deploy
npx prisma generate
```

## Verification

```bash
npm run typecheck
npm run build
```

Frontend:

```bash
npm run typecheck
npm run build
```

For a live web test, configure `TAVILY_API_KEY` and use the authenticated research endpoints.

## Security notes

- Search credentials stay on the backend.
- Retrieved web content is treated as untrusted input.
- The model is explicitly told not to follow instructions contained in web pages.
- Domain filters are validated before being sent upstream.
- Search requests have a server-side timeout.
- Users must already be authenticated to access research endpoints.
