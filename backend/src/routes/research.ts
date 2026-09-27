import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { getAgentConfig } from '../services/agentService.js';
import { generateCompletion } from '../services/aiGateway.js';
import { buildResearchPrompt, searchWeb, type WebSearchOptions } from '../services/webResearchService.js';

export const researchRouter = Router();
researchRouter.use(requireAuth);

const optionsSchema = z.object({
  maxResults: z.coerce.number().int().min(1).max(20).optional(),
  searchDepth: z.enum(['basic', 'advanced', 'fast', 'ultra-fast']).optional(),
  topic: z.enum(['general', 'news', 'finance']).optional(),
  timeRange: z.enum(['day', 'week', 'month', 'year']).optional(),
  includeDomains: z.array(z.string().min(1).max(100)).max(20).optional(),
  excludeDomains: z.array(z.string().min(1).max(100)).max(20).optional(),
  includeRawContent: z.boolean().optional(),
});

const searchSchema = z.object({
  query: z.string().trim().min(2).max(10_000),
}).merge(optionsSchema);

const researchSchema = searchSchema.extend({
  agentId: z.string().min(1).default('research'),
});

researchRouter.post('/search', async (req, res, next) => {
  try {
    const data = searchSchema.parse(req.body);
    const result = await searchWeb(data.query, data as WebSearchOptions);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

researchRouter.post('/', async (req, res, next) => {
  try {
    const data = researchSchema.parse(req.body);
    const result = await searchWeb(data.query, {
      ...data,
      includeRawContent: true,
    });
    const agent = await getAgentConfig(data.agentId);
    const report = await generateCompletion({
      provider: agent.provider,
      model: agent.model,
      systemPrompt: buildResearchPrompt(data.query, result.sources),
      messages: [{ role: 'user', content: `Research and answer: ${data.query}` }],
    });

    res.json({
      query: data.query,
      report,
      sources: result.sources,
      provider: agent.provider,
      model: agent.model,
    });
  } catch (error) {
    next(error);
  }
});
