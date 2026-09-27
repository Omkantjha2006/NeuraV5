import { prisma } from '../config/prisma.js';

export const productivityService = {
  listTasks(userId: string) {
    return prisma.productivityTask.findMany({ where: { userId }, orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { updatedAt: 'desc' }] });
  },
  createTask(userId: string, data: { title: string; description?: string; priority?: string; dueAt?: string }) {
    return prisma.productivityTask.create({ data: { userId, title: data.title, description: data.description, priority: data.priority ?? 'medium', dueAt: data.dueAt ? new Date(data.dueAt) : undefined } });
  },
  updateTask(userId: string, id: string, data: { title?: string; description?: string; status?: string; priority?: string; dueAt?: string | null }) {
    return prisma.productivityTask.update({ where: { id, userId }, data: { ...data, dueAt: data.dueAt === null ? null : data.dueAt ? new Date(data.dueAt) : undefined, completedAt: data.status === 'done' ? new Date() : data.status ? null : undefined } });
  },
  deleteTask(userId: string, id: string) { return prisma.productivityTask.delete({ where: { id, userId } }); },
  listPrompts(userId: string) { return prisma.savedPrompt.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } }); },
  createPrompt(userId: string, data: { title: string; prompt: string; category?: string }) { return prisma.savedPrompt.create({ data: { userId, ...data } }); },
  deletePrompt(userId: string, id: string) { return prisma.savedPrompt.delete({ where: { id, userId } }); },
  listNotes(userId: string) { return prisma.workspaceNote.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } }); },
  upsertNote(userId: string, data: { id?: string; title: string; content: string }) {
    return data.id
      ? prisma.workspaceNote.update({ where: { id: data.id, userId }, data: { title: data.title, content: data.content } })
      : prisma.workspaceNote.create({ data: { userId, title: data.title, content: data.content } });
  },
  deleteNote(userId: string, id: string) { return prisma.workspaceNote.delete({ where: { id, userId } }); },
};
