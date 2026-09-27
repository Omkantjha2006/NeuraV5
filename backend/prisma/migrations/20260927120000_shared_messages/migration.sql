-- P3 #12: backs the chat "Share" action with a real, revocable public link
-- to a single message, instead of it aliasing to Copy.

CREATE TABLE "SharedMessage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token" TEXT NOT NULL,
    "messageId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "contentSnapshot" TEXT NOT NULL,
    "agentName" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SharedMessage_token_key" ON "SharedMessage"("token");
CREATE UNIQUE INDEX "SharedMessage_messageId_userId_key" ON "SharedMessage"("messageId", "userId");
CREATE INDEX "SharedMessage_token_idx" ON "SharedMessage"("token");

ALTER TABLE "SharedMessage" ADD CONSTRAINT "SharedMessage_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SharedMessage" ADD CONSTRAINT "SharedMessage_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SharedMessage" ADD CONSTRAINT "SharedMessage_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
