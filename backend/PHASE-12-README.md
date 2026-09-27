# Neura V5 — Phase 12: AI Memory

Phase 12 adds persistent personalization on top of the existing `Memory` and `UserSettings` models.

## Implemented
- Authenticated memory CRUD API
- Manual memory creation, editing, deletion, and clear-all
- Automatic durable-memory extraction after successful AI responses
- Duplicate protection for exact memory matches
- Memory context injected into future chat requests
- Custom instructions included in the AI system context
- Default-agent preference persisted through UserSettings
- Settings UI for memory management and personalization
- Memory extraction is non-blocking and does not delay the streamed response
- Sensitive secrets are explicitly excluded from automatic memory extraction

## API
- `GET /api/memories`
- `POST /api/memories`
- `PATCH /api/memories/:id`
- `DELETE /api/memories/:id`
- `DELETE /api/memories`
- `GET /api/user/settings`
- `PATCH /api/user/settings`

## Runtime flow
User message → memory + custom-instruction retrieval → Gemini response → asynchronous durable-memory extraction → PostgreSQL.

No new database columns are required because Phase 4 already created `Memory` and `UserSettings`.
