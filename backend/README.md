# Neura V5 Backend

Node.js + Express + TypeScript backend for Neura V5.

> **Current status:** production-shaped backend with auth, RAG, memory,
> multi-model AI gateway, live web research, a multi-agent system, and
> study/developer/productivity/analytics modules already implemented (see
> [Feature status](#feature-status) below). The "Phase 3 scope" section
> further down describes only the original Express foundation and is kept
> for history — it does **not** describe the current state of the codebase.
> See [Feature status](#feature-status) for what's actually live.

> ⚠️ **Before running any Prisma command against production**, read
> [`MIGRATIONS.md`](./MIGRATIONS.md). The `document_chunks` pgvector table
> is not modeled in `schema.prisma` and can be silently dropped by
> `prisma db push` or `prisma migrate reset`. Only `prisma migrate deploy`
> (`npm run prisma:migrate:deploy`) is safe in production.
>
> **Before shipping any change**, run the full verification suite:
> `npm run typecheck`, `npm run build`, `npm test`, and every smoke script
> (`auth:smoke`, `agents:smoke`, `documents:smoke`, `rag:smoke`,
> `memory:smoke`, `ai:smoke`, `developer:smoke`). This project was audited
> by static code review only (no `node_modules`/network in the review
> sandbox) — none of the above has actually been executed yet.

## Feature status

This reflects what's actually in the codebase today, per mounted route (`src/app.ts`) — not the aspirational roadmap. If it's listed here as "Implemented", treat it as a real, working feature, not a placeholder.

| Area | Route prefix | Status | Notes |
|---|---|---|---|
| Health | `/api/health` | Implemented | Liveness/readiness + Prisma check |
| Auth | `/api/auth` | Implemented | Session/cookie auth, Google OAuth |
| Chat | `/api/chat` | Implemented | Live SSE streaming via the AI gateway |
| Conversations & messages | `/api/conversations` | Implemented | Persistence, feedback |
| Agents | `/api/agents` | Implemented | Config-driven, system prompts server-side |
| Documents / RAG | `/api/documents` | Implemented | PDF/DOCX/TXT extraction, pgvector search, auto-retrieval in chat |
| Collections | `/api/collections` | Implemented | |
| Memory | `/api/memories` | Implemented | Manual CRUD + automatic durable-memory extraction |
| AI gateway | `/api/ai` | Implemented | Multi-provider (Gemini + OpenAI-compatible) |
| Research | `/api/research` | Implemented | Tavily-backed web search + AI briefs |
| Study | `/api/study` | Implemented | |
| Developer | `/api/developer` | Implemented, execution opt-in | Code explain/GitHub analysis always on; sandboxed `docker run` execution gated by `CODE_EXECUTION_ENABLED` — see `.env.example` and `GET /api/developer/status` |
| Productivity | `/api/productivity` | Implemented | |
| Analytics | `/api/analytics` | Implemented | |
| Billing / subscriptions | — | **Not implemented** | No billing provider, no subscription models/routes exist anywhere in this backend. There is nothing here to back a "Manage Subscription" button — remove it from the frontend rather than leaving a dead control in production. |
| Share (chat message) | `/api/conversations/:conversationId/messages/:messageId/share`, public `/api/share/:token` | Implemented | Creates/revokes a real, revocable public link to a point-in-time snapshot of one message (not the whole conversation, not editable). Frontend Share button should call this instead of aliasing to Copy — see below. |

For a chronological history of how each area was built, see the `PHASE-*-README.md` files and the phase notes further down this file — those are dated development notes, not a statement of current scope.

### Share API contract (for the frontend "Share" button)

- `POST /api/conversations/:conversationId/messages/:messageId/share` (auth required, caller must own the conversation) → `201 { shareId, url }`. Idempotent per (message, user): calling it again for the same message returns the same link unless it was revoked, in which case a fresh token is issued.
- `DELETE /api/conversations/:conversationId/messages/:messageId/share` (auth required) → `204`, revokes the link.
- `GET /api/share/:token` — **public, no auth**. Returns `{ content, agentName, conversationTitle, sharedAt }` for that one message only (a snapshot taken at share time, so later edits/deletes to the original don't affect it), or `404 SHARE_NOT_FOUND` if the token is unknown/revoked.

Frontend integration: wire the chat message's Share button to `POST .../share`, then either copy `url` to the clipboard or open a share sheet with it, instead of aliasing to Copy. A public `/share/:token` page (rendering the `GET /api/share/:token` response) needs to exist on the frontend for links to be openable by recipients.

## Phase 3 scope (historical)

This described the original, minimal Express foundation before Gemini, SSE, RAG, memory, the multi-model gateway, etc. were added in later phases. It is kept for history only — see [Feature status](#feature-status) above for what's actually implemented now.

### Included

- Express application separated from the process entry point
- Helmet security headers
- CORS with credential support
- JSON and URL-encoded request limits
- Cookie parsing
- Request ID generation/propagation through `x-request-id`
- Morgan request logging
- Centralized 404 and error handling
- Zod validation error formatting
- Environment validation through Zod
- PostgreSQL connectivity through Prisma
- Liveness and readiness health endpoints
- Graceful shutdown with Prisma disconnect
- Existing route modules preserved for auth, agents, conversations, messages, documents, user and memory resources

## Structure

```text
backend/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   │   ├── env.ts
│   │   └── prisma.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── errorHandler.ts
│   ├── routes/
│   ├── services/
│   └── utils/
└── .env.example
```

## Setup

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run dev
```

`DATABASE_URL` must point to a PostgreSQL database.

## Scripts

```bash
npm run dev          # development server
npm run typecheck    # TypeScript validation without emitting files
npm run build        # compile TypeScript to dist/
npm start            # run compiled server
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
npm run seed
```

## Health endpoints

- `GET /api/health/live` — confirms the API process is alive; does not require PostgreSQL.
- `GET /api/health/ready` — confirms the API can reach PostgreSQL; returns `503` when unavailable.
- `GET /api/health` — compatibility endpoint that checks PostgreSQL.

## Phase boundaries (historical, Phase 3 era)

At the time Phase 3 shipped, the items below were not yet implemented. **All of them have since been built** — see [Feature status](#feature-status) for current status of each:

- Gemini generation — done (Phase 7)
- SSE streaming — done (Phase 7)
- Google OAuth callback flow — done (Phase 3/later auth work)
- File upload/storage processing — done (Phase 11)
- RAG / pgvector pipeline — done (Phase 11)
- Automatic AI memory extraction — done (Phase 12)
- Multi-model gateway — done (Phase 13)

This section is kept only so old phase notes still make sense in context; do not use it to judge what's currently implemented.

## Phase 6 — AI Agent System

Agents are configuration-driven in PostgreSQL. Their server-side configuration contains `systemPrompt`, `provider`, `model`, and `capabilities`.

Useful commands:

```bash
npm run seed
npm run agents:smoke
```

The public catalog is available at `GET /api/agents`; system prompts are kept server-side for the Phase 7 AI gateway.


## Phase 7 — Core AI Chat

See `../PHASE-7-README.md`. Live Gemini streaming is available through `POST /api/chat` using SSE. The Gemini key remains server-side and agent system prompts are loaded from PostgreSQL.

## Phase 8 & 9 — Conversation Management + Voice

Phase 8 adds persistent conversation/message management endpoints and message feedback. Phase 9 adds browser-based speech-to-text in the React chat input. See `../PHASE-8-9-README.md` for the complete feature list and setup steps.
