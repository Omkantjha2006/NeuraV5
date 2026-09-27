import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listProviders } from '../services/aiGateway.js';

export const aiRouter = Router();
aiRouter.use(requireAuth);

aiRouter.get('/providers', (_req, res) => {
  res.json({ providers: listProviders() });
});
