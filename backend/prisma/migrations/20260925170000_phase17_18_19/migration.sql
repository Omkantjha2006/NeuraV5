-- Phase 17 Productivity, Phase 18 Analytics support, Phase 19 Audit logging
CREATE TABLE "ProductivityTask" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'todo',
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductivityTask_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProductivityTask_userId_status_idx" ON "ProductivityTask"("userId","status");
CREATE INDEX "ProductivityTask_userId_dueAt_idx" ON "ProductivityTask"("userId","dueAt");
CREATE INDEX "ProductivityTask_userId_updatedAt_idx" ON "ProductivityTask"("userId","updatedAt");
ALTER TABLE "ProductivityTask" ADD CONSTRAINT "ProductivityTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SavedPrompt" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "category" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SavedPrompt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SavedPrompt_userId_updatedAt_idx" ON "SavedPrompt"("userId","updatedAt");
CREATE UNIQUE INDEX "SavedPrompt_userId_title_key" ON "SavedPrompt"("userId","title");
ALTER TABLE "SavedPrompt" ADD CONSTRAINT "SavedPrompt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WorkspaceNote" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WorkspaceNote_userId_updatedAt_idx" ON "WorkspaceNote"("userId","updatedAt");
ALTER TABLE "WorkspaceNote" ADD CONSTRAINT "WorkspaceNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AuditLog" (
  "id" UUID NOT NULL,
  "userId" UUID,
  "action" TEXT NOT NULL,
  "resource" TEXT,
  "metadata" JSONB,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId","createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action","createdAt");
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
