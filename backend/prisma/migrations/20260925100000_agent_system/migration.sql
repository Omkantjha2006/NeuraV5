-- Phase 6: configuration-driven AI agent metadata
ALTER TABLE "Agent"
  ADD COLUMN "systemPrompt" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'google',
  ADD COLUMN "model" TEXT NOT NULL DEFAULT 'gemini-2.5-flash';
