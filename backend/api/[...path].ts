import { app } from '../src/app.js';

/**
 * Vercel serverless entry point for the Express API.
 *
 * The catch-all function keeps the existing /api/* Express routes intact
 * while allowing the backend to run as a Vercel Node.js Function.
 */
export default app;
