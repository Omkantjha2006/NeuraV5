let appPromise: Promise<typeof import('../src/app.js')> | undefined;

function getApp() {
  appPromise ??= import('../src/app.js');
  return appPromise;
}

/**
 * Vercel serverless entry point for the existing Express API.
 *
 * The Express application is loaded lazily so Vercel can bundle the function
 * without executing environment validation/Prisma initialization during the
 * deployment build step.
 */
export default async function handler(req: any, res: any) {
  const { app } = await getApp();
  return app(req, res);
}
