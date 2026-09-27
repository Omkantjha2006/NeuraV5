# Neura V5 — Phase 13: Multi-Model Gateway

## Goal

Introduce a provider abstraction so chat, memory extraction, and future AI features do not depend directly on one AI vendor.

## Implemented

- Provider interface with a common streaming contract.
- Google Gemini provider retained as the default provider.
- OpenAI provider added using the OpenAI-compatible Chat Completions streaming interface.
- Provider/model resolution through a central gateway.
- Provider configuration is environment-driven.
- Existing agent records continue to choose their own `provider` and `model` values.
- `GET /api/ai/providers` exposes provider availability to authenticated clients without exposing API keys.
- Existing `/api/chat` and memory extraction continue using the same gateway API.
- No database migration is required for Phase 13.
- Added an AI gateway smoke test.

## Architecture

```text
React
  |
  v
Node/Express
  |
  +--> Chat Service
  |      |
  |      v
  |   AI Gateway
  |      |
  |      +----> Google Gemini
  |      |
  |      +----> OpenAI
  |      |
  |      +----> Future Providers
  |
  +--> Memory Service
         |
         +----> AI Gateway
```

## Environment variables

```env
GEMINI_API_KEY=
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
DEFAULT_AI_PROVIDER=google
```

Only configured providers are usable for generation. API keys remain server-side.

## API

### `GET /api/ai/providers`

Authenticated endpoint returning provider metadata:

```json
{
  "providers": [
    {
      "id": "google",
      "name": "Google Gemini",
      "defaultModel": "gemini-2.5-flash",
      "configured": true
    },
    {
      "id": "openai",
      "name": "OpenAI",
      "defaultModel": "gpt-4.1-mini",
      "configured": false
    }
  ]
}
```

## Agent configuration

Agents remain configuration-driven:

```text
Agent
├── provider
├── model
├── systemPrompt
└── capabilities
```

Changing an agent's `provider` and `model` changes the provider used by the existing chat pipeline without changing chat logic.

## Verification

Run:

```bash
npm run typecheck
npm run build
npm run ai:smoke
```

No migration command is needed for Phase 13.
