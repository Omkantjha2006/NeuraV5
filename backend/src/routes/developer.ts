import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { analyzeRepository, explainCode, executeInDocker, getCodeExecutionStatus } from '../services/developerService.js';

export const developerRouter = Router();
developerRouter.use(requireAuth);

// Lets the client check whether the sandboxed "Run code" feature can
// actually work here (Docker required — see getCodeExecutionStatus) before
// showing the control or calling POST /execute, instead of surprising the
// user with a 403 when they click Run.
developerRouter.get('/status', async (_req, res, next) => {
  try {
    res.json(await getCodeExecutionStatus());
  } catch (error) { next(error); }
});

developerRouter.post('/explain', async (req, res, next) => {
  try {
    const data = z.object({
      code: z.string().min(1).max(80_000),
      language: z.string().max(40).optional(),
      task: z.string().min(2).max(2_000),
    }).parse(req.body);
    res.json(await explainCode(data));
  } catch (error) { next(error); }
});

developerRouter.post('/github/analyze', async (req, res, next) => {
  try {
    const data = z.object({
      repository: z.string().min(3).max(300),
      question: z.string().max(4_000).optional(),
    }).parse(req.body);
    res.json(await analyzeRepository(data.repository, data.question));
  } catch (error) { next(error); }
});

developerRouter.post('/execute', async (req, res, next) => {
  try {
    const data = z.object({
      code: z.string().min(1).max(50_000),
      language: z.enum(['javascript', 'python']),
      timeoutMs: z.number().int().min(1000).max(10_000).optional(),
    }).parse(req.body);
    res.json(await executeInDocker(data));
  } catch (error) { next(error); }
});
