import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { runStudyTask, STUDY_MODES } from '../services/studyService.js';

export const studyRouter = Router();
studyRouter.use(requireAuth);

const schema = z.object({
  mode: z.enum(STUDY_MODES),
  topic: z.string().trim().min(2).max(20_000),
  context: z.string().max(40_000).optional(),
  agentId: z.string().min(1).default('study'),
});

studyRouter.get('/modes', (_req, res) => {
  res.json({ modes: STUDY_MODES });
});

studyRouter.post('/generate', async (req, res, next) => {
  try {
    const data = schema.parse(req.body);
    const result = await runStudyTask(data);
    res.json(result);
  } catch (error) {
    next(error);
  }
});
