import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAnalytics } from '../services/analyticsService.js';
export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);
analyticsRouter.get('/overview', async (req,res,next)=>{ try { res.json(await getAnalytics(req.userId!)); } catch(e){next(e);} });
