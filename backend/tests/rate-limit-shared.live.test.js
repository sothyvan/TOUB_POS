import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { createClient } from 'redis';
import { createRedisRateLimitStore } from '../src/services/rate-limit-store.service.js';

const API_BASE_URL = process.env.TEST_API_BASE_URL || 'http://127.0.0.1:3000/api';
const REDIS_URL = process.env.TEST_RATE_LIMIT_REDIS_URL;

async function closeServer(server) {
  if (!server) {
    return;
  }
  server.close();
  await once(server, 'close');
}

function createLimitedApp(client, prefix) {
  const app = express();
  app.set('trust proxy', 1);
  app.get('/limited', rateLimit({
    windowMs: 60000,
    max: 2,
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: false,
    store: createRedisRateLimitStore({ client, prefix }),
    handler: (_req, res) => res.status(429).json({
      success: false,
      code: 'RATE_LIMITED',
      message: 'Too many requests.',
    }),
  }), (_req, res) => res.json({ success: true }));
  return app;
}

async function listen(app) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return server;
}

function serverUrl(server) {
  return `http://127.0.0.1:${server.address().port}/limited`;
}

test('two API instances share Redis counters and distinguish proxied clients', {
  skip: !REDIS_URL,
}, async (t) => {
  const firstClient = createClient({ url: REDIS_URL });
  const secondClient = createClient({ url: REDIS_URL });
  firstClient.on('error', () => {});
  secondClient.on('error', () => {});
  await Promise.all([firstClient.connect(), secondClient.connect()]);

  const prefix = `toub-pos:test:${Date.now()}:${Math.random().toString(36).slice(2)}:`;
  const firstServer = await listen(createLimitedApp(firstClient, prefix));
  const secondServer = await listen(createLimitedApp(secondClient, prefix));
  t.after(async () => {
    await Promise.all([closeServer(firstServer), closeServer(secondServer)]);
    await Promise.all([firstClient.close(), secondClient.close()]);
  });

  const firstIpHeaders = { 'X-Forwarded-For': '198.51.100.10' };
  assert.equal((await fetch(serverUrl(firstServer), { headers: firstIpHeaders })).status, 200);
  assert.equal((await fetch(serverUrl(secondServer), { headers: firstIpHeaders })).status, 200);

  const limited = await fetch(serverUrl(firstServer), { headers: firstIpHeaders });
  assert.equal(limited.status, 429);
  assert.equal((await limited.json()).code, 'RATE_LIMITED');

  const distinctClient = await fetch(serverUrl(secondServer), {
    headers: { 'X-Forwarded-For': '198.51.100.11' },
  });
  assert.equal(distinctClient.status, 200);
});

test('authentication endpoint returns the stable 429 contract', async () => {
  const username = `missing-rate-limit-user-${Date.now()}`;
  let response;
  for (let attempt = 0; attempt < 9; attempt += 1) {
    response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: 'DefinitelyWrong123!' }),
    });
  }

  assert.equal(response.status, 429);
  const payload = await response.json();
  assert.equal(payload.success, false);
  assert.equal(payload.code, 'RATE_LIMITED');
  assert.match(payload.message, /Too many login attempts/);
  assert.ok(response.headers.get('retry-after'));
});
