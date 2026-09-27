-- Phase 14: persist web research metadata and source citations on messages
ALTER TABLE "Message" ADD COLUMN "metadata" JSONB;
