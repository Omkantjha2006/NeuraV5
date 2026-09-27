import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { randomToken } from '../utils/crypto.js';
import { AppError } from '../utils/http.js';

function shareUrl(token: string): string {
  return `${env.FRONTEND_URL.replace(/\/$/, '')}/share/${token}`;
}

/**
 * Creates a public share link for one message, or returns the existing
 * non-revoked one if this user already shared this message. This is the
 * real action behind the chat "Share" button (previously it just aliased
 * to Copy).
 *
 * The share is a point-in-time snapshot: it stores the message content as
 * it was at share time, so later edits or deletion of the original message
 * don't change or break a link that's already been handed out.
 */
export async function createShare(userId: string, conversationId: string, messageId: string) {
  const message = await prisma.message.findFirst({
    where: { id: messageId, conversationId, conversation: { userId } },
    include: { agent: { select: { name: true } } },
  });
  if (!message) throw new AppError(404, 'Message not found.', 'NOT_FOUND');

  const existing = await prisma.sharedMessage.findUnique({
    where: { messageId_userId: { messageId, userId } },
  });
  if (existing && !existing.revokedAt) {
    return { shareId: existing.token, url: shareUrl(existing.token) };
  }

  const token = randomToken(16);
  const share = await prisma.sharedMessage.upsert({
    where: { messageId_userId: { messageId, userId } },
    create: {
      token,
      messageId,
      conversationId,
      userId,
      contentSnapshot: message.content,
      agentName: message.agent?.name ?? null,
    },
    // Re-sharing a message the owner previously revoked issues a fresh token
    // rather than reviving the old (possibly already-circulated) one.
    update: {
      token,
      contentSnapshot: message.content,
      agentName: message.agent?.name ?? null,
      revokedAt: null,
    },
  });

  return { shareId: share.token, url: shareUrl(share.token) };
}

export async function revokeShare(userId: string, conversationId: string, messageId: string) {
  const existing = await prisma.sharedMessage.findUnique({
    where: { messageId_userId: { messageId, userId } },
  });
  if (!existing || existing.conversationId !== conversationId) {
    throw new AppError(404, 'This message has not been shared.', 'NOT_FOUND');
  }
  await prisma.sharedMessage.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });
}

/**
 * Public read: intentionally returns only the shared message's snapshot plus
 * light context (conversation title, agent name, role, timestamp) — never
 * the rest of the conversation, the owner's identity, or anything requiring
 * auth. Used by the public /share/:token page.
 */
export async function getPublicShare(token: string) {
  const share = await prisma.sharedMessage.findUnique({
    where: { token },
    include: { conversation: { select: { title: true } } },
  });
  if (!share || share.revokedAt) {
    throw new AppError(404, 'This shared link is invalid or has been revoked.', 'SHARE_NOT_FOUND');
  }
  return {
    content: share.contentSnapshot,
    agentName: share.agentName,
    conversationTitle: share.conversation.title,
    sharedAt: share.createdAt,
  };
}
