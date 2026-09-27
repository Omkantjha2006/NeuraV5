import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { productivityService } from '../services/productivityService.js';

export const productivityRouter = Router();
productivityRouter.use(requireAuth);

const taskSchema = z.object({ title: z.string().trim().min(1).max(200), description: z.string().max(5000).optional(), priority: z.enum(['low','medium','high']).optional(), dueAt: z.string().datetime().optional() });
const updateTaskSchema = taskSchema.partial().extend({ status: z.enum(['todo','in_progress','done']).optional(), dueAt: z.string().datetime().nullable().optional() });
const promptSchema = z.object({ title: z.string().trim().min(1).max(120), prompt: z.string().min(1).max(10000), category: z.string().max(80).optional() });
const noteSchema = z.object({ id: z.string().uuid().optional(), title: z.string().trim().min(1).max(200), content: z.string().max(30000) });

productivityRouter.get('/tasks', async (req,res,next)=>{ try { res.json({ tasks: await productivityService.listTasks(req.userId!) }); } catch(e){next(e);} });
productivityRouter.post('/tasks', async (req,res,next)=>{ try { res.status(201).json({ task: await productivityService.createTask(req.userId!, taskSchema.parse(req.body)) }); } catch(e){next(e);} });
productivityRouter.patch('/tasks/:id', async (req,res,next)=>{ try { res.json({ task: await productivityService.updateTask(req.userId!, req.params.id, updateTaskSchema.parse(req.body)) }); } catch(e){next(e);} });
productivityRouter.delete('/tasks/:id', async (req,res,next)=>{ try { await productivityService.deleteTask(req.userId!, req.params.id); res.status(204).end(); } catch(e){next(e);} });

productivityRouter.get('/prompts', async (req,res,next)=>{ try { res.json({ prompts: await productivityService.listPrompts(req.userId!) }); } catch(e){next(e);} });
productivityRouter.post('/prompts', async (req,res,next)=>{ try { res.status(201).json({ prompt: await productivityService.createPrompt(req.userId!, promptSchema.parse(req.body)) }); } catch(e){next(e);} });
productivityRouter.delete('/prompts/:id', async (req,res,next)=>{ try { await productivityService.deletePrompt(req.userId!, req.params.id); res.status(204).end(); } catch(e){next(e);} });

productivityRouter.get('/notes', async (req,res,next)=>{ try { res.json({ notes: await productivityService.listNotes(req.userId!) }); } catch(e){next(e);} });
productivityRouter.post('/notes', async (req,res,next)=>{ try { res.status(201).json({ note: await productivityService.upsertNote(req.userId!, noteSchema.parse(req.body)) }); } catch(e){next(e);} });
productivityRouter.patch('/notes/:id', async (req,res,next)=>{ try { res.json({ note: await productivityService.upsertNote(req.userId!, noteSchema.parse({ ...req.body, id: req.params.id })) }); } catch(e){next(e);} });
productivityRouter.delete('/notes/:id', async (req,res,next)=>{ try { await productivityService.deleteNote(req.userId!, req.params.id); res.status(204).end(); } catch(e){next(e);} });
