import test from 'node:test';
import assert from 'node:assert/strict';
import { createGracefulShutdown } from '../src/startup/graceful-shutdown.js';

function resolvedStep(events, name) {
  return () => {
    events.push(name);
    return Promise.resolve();
  };
}

test('graceful shutdown is idempotent and closes dependencies in safe order', async () => {
  const events = [];
  const httpServer = {
    listening: true,
    close(callback) {
      events.push('http_close_started');
      this.listening = false;
      setImmediate(() => {
        events.push('http_close_finished');
        callback();
      });
    },
    closeIdleConnections() {
      events.push('http_idle_closed');
    },
    closeAllConnections() {
      events.push('http_forced_closed');
    },
  };

  const shutdown = createGracefulShutdown({
    httpServer,
    gracePeriodMs: 1000,
    markDraining: () => events.push('draining'),
    stopBackgroundWorkers: resolvedStep(events, 'workers_stopped'),
    closeWebSockets: resolvedStep(events, 'websockets_closed'),
    closeRateLimitStore: resolvedStep(events, 'redis_closed'),
    closeDatabase: resolvedStep(events, 'database_closed'),
    writeEvent: (event) => events.push(event),
  });

  const firstShutdown = shutdown('SIGTERM');
  const repeatedShutdown = shutdown('SIGINT');
  assert.strictEqual(firstShutdown, repeatedShutdown);
  assert.deepEqual(await firstShutdown, { forced: false });

  assert.equal(events.filter((event) => event === 'draining').length, 1);
  assert.ok(events.indexOf('workers_stopped') < events.indexOf('redis_closed'));
  assert.ok(events.indexOf('websockets_closed') < events.indexOf('redis_closed'));
  assert.ok(events.indexOf('http_close_finished') < events.indexOf('redis_closed'));
  assert.ok(events.indexOf('redis_closed') < events.indexOf('database_closed'));
  assert.equal(events.at(-1), 'shutdown_completed');
  assert.ok(!events.includes('http_forced_closed'));
});

test('graceful shutdown force-closes HTTP connections after its deadline', async () => {
  let forcedCloseCount = 0;
  const httpServer = {
    listening: true,
    close() {},
    closeIdleConnections() {},
    closeAllConnections() {
      forcedCloseCount += 1;
    },
  };
  const neverCompletes = () => new Promise(() => {});
  const shutdown = createGracefulShutdown({
    httpServer,
    gracePeriodMs: 20,
    markDraining() {},
    stopBackgroundWorkers: neverCompletes,
    closeWebSockets: () => Promise.resolve(),
    closeRateLimitStore: () => Promise.resolve(),
    closeDatabase: () => Promise.resolve(),
    writeEvent() {},
  });

  await assert.rejects(
    shutdown('SIGTERM'),
    (error) => error.code === 'SHUTDOWN_TIMEOUT',
  );
  assert.equal(forcedCloseCount, 1);
});

test('graceful shutdown still closes Redis and MySQL after an earlier close failure', async () => {
  const events = [];
  const httpServer = {
    listening: true,
    close(callback) {
      this.listening = false;
      callback();
    },
    closeIdleConnections() {},
    closeAllConnections() {},
  };
  const shutdown = createGracefulShutdown({
    httpServer,
    gracePeriodMs: 1000,
    markDraining() {},
    stopBackgroundWorkers: () => Promise.reject(new Error('worker close failed')),
    closeWebSockets: resolvedStep(events, 'websockets_closed'),
    closeRateLimitStore: resolvedStep(events, 'redis_closed'),
    closeDatabase: resolvedStep(events, 'database_closed'),
    writeEvent() {},
  });

  await assert.rejects(shutdown('SIGTERM'), /worker close failed/);
  assert.deepEqual(events, ['websockets_closed', 'redis_closed', 'database_closed']);
});
