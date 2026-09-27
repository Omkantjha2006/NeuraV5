import { Router } from 'express';
import { z } from 'zod';
import { getPublicShare } from '../services/shareService.js';

// Intentionally NOT behind requireAuth: this is the public link a user gets
// from the chat "Share" button, meant to be opened by anyone it's sent to.
// getPublicShare() only ever returns that one message's snapshot, never the
// rest of the conversation or the sharer's identity.
export const shareRouter = Router();

const tokenSchema = z.string().min(10).max(200);

shareRouter.get('/:token', async (req, res, next) => {
  try {
    const token = tokenSchema.parse(req.params.token);
    res.json(await getPublicShare(token));
  } catch (error) {
    next(error);
  }
});
