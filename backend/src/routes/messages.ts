import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../utils/http.js';
import { getAgentConfig, getActiveAgent } from '../services/agentService.js';
import { generateCompletion, streamCompletion, type GatewayMessage } from '../services/aiGateway.js';
import { buildRagContext, searchKnowledge, type RagSource } from '../services/ragService.js';
import { buildMemoryContext, extractAndSaveMemories, getUserMemories } from '../services/memoryService.js';
import { buildWebResearchContext, searchWeb, type WebSearchOptions, type WebSource } from '../services/webResearchService.js';
import { createShare, revokeShare } from '../services/shareService.js';
import { captureException } from '../config/sentry.js';

export const messagesRouter = Router();
messagesRouter.use(requireAuth);

const webOptionsSchema = z.object({
  maxResults: z.coerce.number().int().min(1).max(20).optional(),
  searchDepth: z.enum(['basic', 'advanced', 'fast', 'ultra-fast']).optional(),
  topic: z.enum(['general', 'news', 'finance']).optional(),
  timeRange: z.enum(['day', 'week', 'month', 'year']).optional(),
  includeDomains: z.array(z.string().min(1).max(100)).max(20).optional(),
  excludeDomains: z.array(z.string().min(1).max(100)).max(20).optional(),
});

const sendSchema = z.object({
  content: z.string().trim().min(1).max(100_000),
  agentId: z.string().min(1),
  webResearch: z.boolean().optional().default(false),
  webOptions: webOptionsSchema.optional(),
});

function toGatewayMessages(
  messages: Array<{ role: string; content: string }>,
): GatewayMessage[] {
  return messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      content: message.content,
    }));
}

async function getConversationForUser(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!conversation) throw new AppError(404, 'Conversation not found', 'NOT_FOUND');
  return conversation;
}

// When "save conversation history" is off, the conversation title must not be
// derived from message content, since the title is the one piece of the
// conversation that is never purged (see purgeHistoryIfDisabled below).
const PRIVATE_CONVERSATION_TITLE = 'Temporary chat';

export function resolveConversationTitle(historyEnabled: boolean, content: string) {
  return historyEnabled ? content.slice(0, 60) : PRIVATE_CONVERSATION_TITLE;
}

async function createUserMessage(
  conversationId: string,
  content: string,
  agentId: string,
  historyEnabled: boolean,
  metadata?: Prisma.InputJsonValue,
) {
  const agent = await getActiveAgent(agentId);
  const userMessage = await prisma.message.create({
    data: {
      conversationId,
      role: 'user',
      content,
      agentId,
      metadata: metadata as any,
    },
  });

  const current = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { title: true },
  });
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      agentId,
      updatedAt: new Date(),
      ...(current?.title === 'New Conversation' || current?.title === PRIVATE_CONVERSATION_TITLE
        ? { title: resolveConversationTitle(historyEnabled, content) }
        : {}),
    },
  });

  return { userMessage, agent };
}

// "Save conversation history" (off by user choice) means Neura must not retain
// the conversation's contents. The current architecture still needs the
// message rows to exist for the duration of a single request (to build the
// prompt/context from the DB), so instead of never writing them we write them
// and then hard-delete every message in the conversation once the response
// has been produced. This is called from every path that finishes a turn
// (success, client-disconnect fallback, and error fallback).
function purgeHistoryIfDisabled(conversationId: string, historyEnabled: boolean) {
  if (historyEnabled) return;
  void prisma.message.deleteMany({ where: { conversationId } }).catch(() => undefined);
}

function setSseHeaders(res: any) {
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
}

function sendEvent(res: any, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function streamConversationResponse(
  req: any,
  res: any,
  conversationId: string,
  agentId: string,
  userContent: string | null,
  regenerate: boolean,
  webResearch = false,
  webOptions: WebSearchOptions = {},
) {
  const userId = req.userId as string;
  const [conversationLookup, settings] = await Promise.all([
    prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    }),
    prisma.userSettings.findUnique({ where: { userId } }),
  ]);
  let conversation = conversationLookup;
  if (!conversation) throw new AppError(404, 'Conversation not found', 'NOT_FOUND');
  const historyEnabled = settings?.saveConversationHistory ?? true;

  let agent;
  if (regenerate) {
    const lastUser = [...conversation.messages].reverse().find((message) => message.role === 'user');
    if (!lastUser) throw new AppError(400, 'There is no user message to regenerate.', 'NOTHING_TO_REGENERATE');

    agent = await getAgentConfig(conversation.agentId);
    agentId = conversation.agentId;

    await prisma.message.deleteMany({
      where: {
        conversationId,
        role: 'assistant',
        createdAt: { gt: lastUser.createdAt },
      },
    });

    conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) throw new AppError(404, 'Conversation not found', 'NOT_FOUND');
  } else {
    if (!userContent) throw new AppError(400, 'Message content is required.', 'INVALID_MESSAGE');
    const created = await createUserMessage(conversationId, userContent, agentId, historyEnabled, webResearch ? { webResearch: true, webOptions } : undefined);
    agent = {
      id: created.agent.id,
      name: created.agent.name,
      systemPrompt: created.agent.systemPrompt,
      provider: created.agent.provider,
      model: created.agent.model,
      capabilities: created.agent.capabilities,
    };
    conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) throw new AppError(404, 'Conversation not found', 'NOT_FOUND');
  }

  const lastUserMessage = [...conversation.messages].reverse().find((message) => message.role === 'user');
  const savedMetadata = lastUserMessage?.metadata && typeof lastUserMessage.metadata === 'object'
    ? lastUserMessage.metadata as { webResearch?: boolean; webOptions?: WebSearchOptions }
    : null;

  if (regenerate && savedMetadata?.webResearch) {
    webResearch = true;
    webOptions = savedMetadata.webOptions ?? {};
  }

  const history = toGatewayMessages(conversation.messages);
  let ragSources: RagSource[] = [];
  let webSources: WebSource[] = [];
  const researchQuery =
  userContent ??
  [...conversation.messages].reverse().find((m) => m.role === 'user')?.content ??
  '';
  const [ragResult, webResult] = await Promise.all([
    searchKnowledge(userId, researchQuery).catch(() => [] as RagSource[]),
    webResearch
      ? searchWeb(researchQuery, webOptions).catch(() => ({ sources: [] as WebSource[] }))
      : Promise.resolve({ sources: [] as WebSource[] }),
  ]);
  ragSources = ragResult;
  webSources = webResult.sources;

  const ragContext = buildRagContext(ragSources);
  const webContext = webResearch ? buildWebResearchContext(webSources) : '';
  const memories = await getUserMemories(userId);
  const memoryContext = buildMemoryContext(memories);
  const customInstructions = settings?.customInstructions?.trim()
    ? `\n\nUSER CUSTOM INSTRUCTIONS:\n${settings.customInstructions.trim()}`
    : '';
  const ragSystemPrompt = `${agent.systemPrompt}${customInstructions}${memoryContext}${ragContext}${webContext}`;
  const controller = new AbortController();
  let disconnected = false;
  let completed = false;
  let accumulated = '';
  let persisted = false;

  const onClose = () => {
    if (!completed) {
      disconnected = true;
      controller.abort();
    }
  };
  res.on('close', onClose);

  setSseHeaders(res);
  sendEvent(res, 'meta', {
    conversationId,
    agentId,
    model: agent.model,
    provider: agent.provider,
  });
  if (ragSources.length || webSources.length) {
    sendEvent(res, 'sources', {
      ragSources: ragSources.map((source) => ({
        documentId: source.documentId,
        documentName: source.documentName,
        chunkIndex: source.chunkIndex,
        page: source.page,
        score: source.score,
      })),
      webSources,
    });
  }

  try {
    for await (const token of streamCompletion({
      provider: agent.provider,
      model: agent.model,
      systemPrompt: ragSystemPrompt,
      messages: history,
      signal: controller.signal,
    })) {
      if (disconnected) break;
      accumulated += token;
      sendEvent(res, 'token', { text: token });
    }

    if (accumulated) {
      const assistant = await prisma.message.create({
        data: {
          conversationId,
          role: 'assistant',
          content: accumulated,
          agentId,
          metadata: webResearch || ragSources.length
            ? { webResearch, webSources, ragSources: ragSources.map((source) => ({
                documentId: source.documentId,
                documentName: source.documentName,
                chunkIndex: source.chunkIndex,
                page: source.page,
                score: source.score,
              })) }
            : undefined,
        },
      });
      persisted = true;
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
      if (!disconnected) sendEvent(res, 'done', { message: assistant });

      if (historyEnabled) {
        // Memory extraction is intentionally non-blocking so it never delays the chat
        // response. It's skipped entirely when history-saving is off: deriving and
        // persisting long-term memories from a conversation the user asked us not to
        // keep would contradict the setting.
        void extractAndSaveMemories({
          userId,
          userContent: userContent ?? [...conversation.messages].reverse().find((m) => m.role === 'user')?.content ?? '',
          assistantContent: accumulated,
          provider: agent.provider,
          model: agent.model,
        });
      } else {
        purgeHistoryIfDisabled(conversationId, historyEnabled);
      }
    } else if (!disconnected) {
      purgeHistoryIfDisabled(conversationId, historyEnabled);
      sendEvent(res, 'error', {
        code: 'AI_EMPTY_RESPONSE',
        message: 'The AI provider returned an empty response.',
      });
    }
  } catch (error) {
    if (accumulated && !persisted) {
      await prisma.message.create({
        data: {
          conversationId,
          role: 'assistant',
          content: accumulated,
          agentId,
          metadata: webResearch || ragSources.length
            ? { webResearch, webSources, ragSources: ragSources.map((source) => ({
                documentId: source.documentId,
                documentName: source.documentName,
                chunkIndex: source.chunkIndex,
                page: source.page,
                score: source.score,
              })) }
            : undefined,
        },
      }).then(() => { persisted = true; }).catch(() => undefined);
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }).catch(() => undefined);
    }
    purgeHistoryIfDisabled(conversationId, historyEnabled);

    if (!disconnected) {
      // This SSE path never reaches Express's error-handling middleware, so
      // report it to monitoring directly rather than flying blind.
      captureException(error, { conversationId, agentId, provider: agent.provider, model: agent.model });
      const message = error instanceof Error ? error.message : 'AI generation failed.';
      sendEvent(res, 'error', {
        code: error instanceof AppError ? error.code : 'AI_GENERATION_FAILED',
        message,
      });
    }
  } finally {
    completed = true;
    res.off('close', onClose);
    if (disconnected && accumulated && !persisted) {
      await prisma.message.create({
        data: {
          conversationId,
          role: 'assistant',
          content: accumulated,
          agentId,
          metadata: webResearch || ragSources.length
            ? { webResearch, webSources, ragSources: ragSources.map((source) => ({
                documentId: source.documentId,
                documentName: source.documentName,
                chunkIndex: source.chunkIndex,
                page: source.page,
                score: source.score,
              })) }
            : undefined,
        },
      }).then(() => { persisted = true; }).catch(() => undefined);
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }).catch(() => undefined);
      purgeHistoryIfDisabled(conversationId, historyEnabled);
    }
    if (!res.writableEnded) res.end();
  }
}

const messageIdSchema = z.string().uuid();
const messageUpdateSchema = z.object({
  content: z.string().trim().min(1).max(100_000),
});
const feedbackSchema = z.object({
  feedback: z.enum(['positive', 'negative']).nullable(),
});

async function getOwnedMessage(messageId: string, userId: string) {
  const message = await prisma.message.findFirst({
    where: { id: messageId, conversation: { userId } },
    include: { conversation: { select: { id: true, title: true } } },
  });
  if (!message) throw new AppError(404, 'Message not found', 'NOT_FOUND');
  return message;
}

messagesRouter.patch('/:conversationId/messages/:messageId', async (req, res, next) => {
  try {
    const conversationId = z.string().uuid().parse(req.params.conversationId);
    const messageId = messageIdSchema.parse(req.params.messageId);
    const data = messageUpdateSchema.parse(req.body);
    const message = await getOwnedMessage(messageId, req.userId!);
    if (message.conversationId !== conversationId) throw new AppError(404, 'Message not found', 'NOT_FOUND');
    if (message.role !== 'user') throw new AppError(400, 'Only user messages can be edited.', 'INVALID_MESSAGE_ROLE');

    await prisma.message.deleteMany({
      where: { conversationId, createdAt: { gt: message.createdAt } },
    });

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { content: data.content, feedback: null },
    });
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { title: message.conversation.title === 'New Conversation' ? data.content.slice(0, 60) : message.conversation.title, updatedAt: new Date() },
    });

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId: req.userId! },
      include: { agent: true, messages: { orderBy: { createdAt: 'asc' } } },
    });
    res.json({ message: updated, conversation });
  } catch (error) {
    next(error);
  }
});

messagesRouter.delete('/:conversationId/messages/:messageId', async (req, res, next) => {
  try {
    const conversationId = z.string().uuid().parse(req.params.conversationId);
    const messageId = messageIdSchema.parse(req.params.messageId);
    const message = await getOwnedMessage(messageId, req.userId!);
    if (message.conversationId !== conversationId) throw new AppError(404, 'Message not found', 'NOT_FOUND');
    await prisma.message.delete({ where: { id: messageId } });
    await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

messagesRouter.patch('/:conversationId/messages/:messageId/feedback', async (req, res, next) => {
  try {
    const conversationId = z.string().uuid().parse(req.params.conversationId);
    const messageId = messageIdSchema.parse(req.params.messageId);
    const data = feedbackSchema.parse(req.body);
    const message = await getOwnedMessage(messageId, req.userId!);
    if (message.conversationId !== conversationId) throw new AppError(404, 'Message not found', 'NOT_FOUND');
    if (message.role !== 'assistant') throw new AppError(400, 'Feedback can only be added to assistant messages.', 'INVALID_MESSAGE_ROLE');
    const updated = await prisma.message.update({ where: { id: messageId }, data: { feedback: data.feedback } });
    res.json({ message: updated });
  } catch (error) {
    next(error);
  }
});

// Real "Share" action for a chat message: creates (or reuses) a revocable
// public link, instead of the button aliasing to Copy. GET is a no-op status
// check; POST creates/returns the link; DELETE revokes it.
messagesRouter.post('/:conversationId/messages/:messageId/share', async (req, res, next) => {
  try {
    const conversationId = z.string().uuid().parse(req.params.conversationId);
    const messageId = messageIdSchema.parse(req.params.messageId);
    const share = await createShare(req.userId!, conversationId, messageId);
    res.status(201).json(share);
  } catch (error) {
    next(error);
  }
});

messagesRouter.delete('/:conversationId/messages/:messageId/share', async (req, res, next) => {
  try {
    const conversationId = z.string().uuid().parse(req.params.conversationId);
    const messageId = messageIdSchema.parse(req.params.messageId);
    await revokeShare(req.userId!, conversationId, messageId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

messagesRouter.post('/:conversationId/messages/stream', async (req, res, next) => {
  try {
    const data = sendSchema.parse(req.body);
    await streamConversationResponse(req, res, req.params.conversationId, data.agentId, data.content, false, data.webResearch, data.webOptions);
  } catch (error) {
    if (!res.headersSent) next(error);
    else res.end();
  }
});

messagesRouter.post('/:conversationId/messages/regenerate/stream', async (req, res, next) => {
  try {
    await streamConversationResponse(req, res, req.params.conversationId, '', null, true);
  } catch (error) {
    if (!res.headersSent) next(error);
    else res.end();
  }
});

messagesRouter.post('/:conversationId/messages', async (req, res, next) => {
  try {
    const data = sendSchema.parse(req.body);
    const conversation = await getConversationForUser(req.params.conversationId, req.userId!);
    const agent = await getAgentConfig(data.agentId);
    const existing = toGatewayMessages(conversation.messages);
    const settings = await prisma.userSettings.findUnique({ where: { userId: req.userId! } });
    const historyEnabled = settings?.saveConversationHistory ?? true;

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: data.content,
        agentId: data.agentId,
        metadata: data.webResearch ? { webResearch: true, webOptions: data.webOptions ?? {} } : undefined,
      },
    });

    const history = [...existing, { role: 'user' as const, content: data.content }];
    const [ragSources, webResult] = await Promise.all([
      searchKnowledge(req.userId!, data.content).catch(() => [] as RagSource[]),
      data.webResearch
        ? searchWeb(data.content, data.webOptions ?? {}).catch(() => ({ sources: [] as WebSource[] }))
        : Promise.resolve({ sources: [] as WebSource[] }),
    ]);
    const webSources = webResult.sources;
    const content = await generateCompletion({
      provider: agent.provider,
      model: agent.model,
      systemPrompt: `${agent.systemPrompt}${buildRagContext(ragSources)}${data.webResearch ? buildWebResearchContext(webSources) : ''}`,
      messages: history,
    });

    const assistant = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content,
        agentId: data.agentId,
        metadata: data.webResearch || ragSources.length
          ? { webResearch: data.webResearch, webSources, ragSources: ragSources.map((source) => ({
              documentId: source.documentId,
              documentName: source.documentName,
              chunkIndex: source.chunkIndex,
              page: source.page,
              score: source.score,
            })) }
          : undefined,
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        agentId: data.agentId,
        updatedAt: new Date(),
        ...(conversation.title === 'New Conversation' || conversation.title === PRIVATE_CONVERSATION_TITLE
          ? { title: resolveConversationTitle(historyEnabled, data.content) }
          : {}),
      },
    });

    purgeHistoryIfDisabled(conversation.id, historyEnabled);

    res.status(201).json({ message: assistant });
  } catch (error) {
    next(error);
  }
});
