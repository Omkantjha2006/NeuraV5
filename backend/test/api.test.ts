import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/neura_test';
process.env.FRONTEND_URL ??= 'http://localhost:5173';
process.env.RATE_LIMIT_MAX ??= '300';
process.env.AUTH_RATE_LIMIT_MAX ??= '20';

const { app } = await import('../src/app.js');

async function withServer(run: (baseUrl: string) => Promise<void>) {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    await run(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve()),
    );
  }
}

test('GET /api/health/live reports API liveness and request id', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health/live`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-request-id')?.length, 36);
    assert.deepEqual(await response.json(), {
      status: 'ok',
      service: 'neura-api',
    });
  });
});

test('unknown routes return a structured 404 response', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/does-not-exist`);
    assert.equal(response.status, 404);
    const body = await response.json();
    assert.equal(body.error.code, 'NOT_FOUND');
  });
});

test('invalid registration data is rejected before database access', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'A', email: 'not-an-email', password: 'short' }),
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(body.error.details));
  });
});

test('protected chat endpoint rejects unauthenticated requests', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'Hello', agentId: 'general' }),
    });
    assert.equal(response.status, 401);
    const body = await response.json();
    assert.equal(body.error.code, 'UNAUTHENTICATED');
  });
});

test('Google OAuth start responds correctly for the configured environment', async () => {
  const oauthConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CALLBACK_URL,
  );

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/google`, { redirect: 'manual' });

    if (oauthConfigured) {
      assert.equal(response.status, 302);
      const location = response.headers.get('location');
      assert.ok(location);
      assert.match(location, /^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth/);
    } else {
      assert.equal(response.status, 503);
      const body = await response.json();
      assert.equal(body.error.code, 'GOOGLE_OAUTH_NOT_CONFIGURED');
    }
  });
});
