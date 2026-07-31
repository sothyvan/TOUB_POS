import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { createRedisRateLimitStore } from '../src/services/rate-limit-store.service.js';

test('a shared-store failure blocks authentication traffic with a safe 503', async (t) => {
  const failingClient = {
    sendCommand() {
      return Promise.reject(new Error('redis://user:secret@example.invalid is unavailable'));
    },
  };
  const app = express();
  app.get('/auth', rateLimit({
    windowMs: 60000,
    max: 1,
    passOnStoreError: false,
    store: createRedisRateLimitStore({ client: failingClient, prefix: 'test:failure:' }),
  }), (_req, res) => res.json({ success: true }));
  app.use((error, _req, res, _next) => {
    res.status(error.status || 500).json({
      success: false,
      code: error.code,
      message: error.message,
    });
  });

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    server.close();
    await once(server, 'close');
  });

  const response = await fetch(`http://127.0.0.1:${server.address().port}/auth`);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    success: false,
    code: 'RATE_LIMIT_STORE_UNAVAILABLE',
    message: 'Authentication protection is temporarily unavailable.',
  });
});
