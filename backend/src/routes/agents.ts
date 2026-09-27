import { Router } from 'express';
import { getActiveAgent, listActiveAgents } from '../services/agentService.js';

export const agentsRouter = Router();

/** Public catalog used by the frontend agent selector and landing page. */
agentsRouter.get('/', async (_req, res, next) => {
  try {
    const agents = await listActiveAgents();
    res.json({ agents });
  } catch (error) {
    next(error);
  }
});

/** Public metadata lookup for a single active agent. */
agentsRouter.get('/:id', async (req, res, next) => {
  try {
    const agent = await getActiveAgent(req.params.id);
    const { systemPrompt: _systemPrompt, provider: _provider, model: _model, ...publicAgent } = agent;
    res.json({ agent: publicAgent });
  } catch (error) {
    next(error);
  }
});
