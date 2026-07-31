import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getLifecycleConfiguration } from '../src/config/lifecycle.config.js';
import {
  markApplicationDraining,
  markApplicationReady,
  markApplicationStarting,
  rejectRequestsWhileDraining,
} from '../src/services/application-lifecycle.service.js';
import {
  getLivenessStatus,
  getReadinessStatus,
} from '../src/services/health.service.js';

afterEach(() => markApplicationStarting());

test('liveness is independent from application readiness and database state', () => {
  markApplicationDraining();
  assert.deepEqual(getLivenessStatus(), {
    success: true,
    status: 'alive',
  });
});

test('readiness remains closed before startup completes and while draining', async () => {
  let databaseCalls = 0;
  const database = {
    authenticate() {
      databaseCalls += 1;
      return Promise.resolve();
    },
  };

  const starting = await getReadinessStatus({ database, timeoutMs: 100 });
  markApplicationDraining();
  const draining = await getReadinessStatus({ database, timeoutMs: 100 });

  assert.equal(starting.status, 'not_ready');
  assert.equal(starting.phase, 'starting');
  assert.equal(draining.status, 'not_ready');
  assert.equal(draining.phase, 'draining');
  assert.equal(databaseCalls, 0);
});

test('readiness reflects database availability without exposing its error', async () => {
  markApplicationReady();

  const available = await getReadinessStatus({
    database: { authenticate: () => Promise.resolve() },
    timeoutMs: 100,
  });
  const unavailable = await getReadinessStatus({
    database: {
      authenticate() {
        return Promise.reject(new Error('sensitive database connection detail'));
      },
    },
    timeoutMs: 100,
  });

  assert.equal(available.success, true);
  assert.equal(available.checks.database, 'available');
  assert.equal(unavailable.success, false);
  assert.equal(unavailable.checks.database, 'unavailable');
  assert.doesNotMatch(JSON.stringify(unavailable), /sensitive database/);
});

test('readiness database checks use a bounded timeout', async () => {
  markApplicationReady();
  const startedAt = Date.now();
  const status = await getReadinessStatus({
    database: { authenticate: () => new Promise(() => {}) },
    timeoutMs: 20,
  });

  assert.equal(status.success, false);
  assert.equal(status.checks.database, 'unavailable');
  assert.ok(Date.now() - startedAt < 500);
});

test('drain guard rejects new business requests with a retryable 503', () => {
  markApplicationDraining();
  const headers = {};
  let responseStatus;
  let responseBody;
  const response = {
    set(name, value) {
      headers[name] = value;
      return this;
    },
    status(value) {
      responseStatus = value;
      return this;
    },
    json(value) {
      responseBody = value;
      return this;
    },
  };

  rejectRequestsWhileDraining({}, response, () => {
    throw new Error('Drain guard must not pass the request onward.');
  });

  assert.equal(responseStatus, 503);
  assert.equal(responseBody.code, 'SERVICE_DRAINING');
  assert.equal(headers.Connection, 'close');
  assert.equal(headers['Retry-After'], '5');
});

test('lifecycle configuration has bounded production-safe defaults', () => {
  assert.deepEqual(getLifecycleConfiguration({}), {
    readinessDatabaseTimeoutMs: 2000,
    shutdownGracePeriodMs: 15000,
  });
  assert.throws(
    () => getLifecycleConfiguration({ READINESS_DATABASE_TIMEOUT_MS: '99' }),
    /READINESS_DATABASE_TIMEOUT_MS/,
  );
  assert.throws(
    () => getLifecycleConfiguration({ SHUTDOWN_GRACE_PERIOD_MS: '120001' }),
    /SHUTDOWN_GRACE_PERIOD_MS/,
  );
});
