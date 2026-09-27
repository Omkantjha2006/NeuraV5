-- Phase 8: persistent message feedback.
CREATE TYPE "MessageFeedback" AS ENUM ('positive', 'negative');

ALTER TABLE "Message" ADD COLUMN "feedback" "MessageFeedback";
