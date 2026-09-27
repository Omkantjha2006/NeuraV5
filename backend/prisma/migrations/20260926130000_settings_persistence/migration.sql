-- Persist previously local-only settings controls.
ALTER TABLE "UserSettings"
  ADD COLUMN "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "conversationResponses" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "documentProcessingNotifications" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "productUpdates" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "securityAlerts" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "allowDataTraining" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "activityTracking" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "codeSyntaxHighlighting" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "fontSize" TEXT NOT NULL DEFAULT 'medium';
