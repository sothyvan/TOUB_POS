import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { errorHandler } from '../src/middleware/error.middleware.js';
import {
  requestContext,
  requestLogger,
} from '../src/middleware/logger.middleware.js';
import { httpError } from '../src/utils/http-error.util.js';
import { redactForLog } from '../src/utils/logger.util.js';

function captureStream(stream, callback) {
  const original = stream.write;
  const lines = [];
  stream.write = (line) => {
    lines.push(String(line).trim());
    return true;
  };
  try {
    callback();
  } finally {
    stream.write = original;
  }
  return lines;
}

function createResponse() {
  return {
    statusCode: null,
    body: null,
    status(value) {
      this.statusCode = value;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
  };
}

test('unexpected database errors return a generic correlated response and a redacted diagnostic', () => {
  const error = new Error('Unknown column; password=hunter2; Bearer access-token-value');
  error.name = 'SequelizeDatabaseError';
  error.code = 'ER_BAD_FIELD_ERROR';
  const req = {
    requestId: 'req-db-failure-1',
    method: 'POST',
    path: '/api/orders',
    query: { csrf_token: 'query-secret' },
    params: {},
    body: {
      items: [{ product_id: 7 }],
      password: 'body-secret',
      nested: { device_token: 'device-secret' },
    },
    user: { id: 42, role: 'cashier' },
  };
  const res = createResponse();

  const lines = captureStream(process.stderr, () => errorHandler(error, req, res, () => {}));

  assert.deepEqual(res.body, {
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal server error.',
    request_id: 'req-db-failure-1',
  });
  assert.equal(res.statusCode, 500);
  assert.equal(lines.length, 1);
  const log = JSON.parse(lines[0]);
  assert.equal(log.event, 'http_request_failed');
  assert.equal(log.request_id, 'req-db-failure-1');
  assert.equal(log.error.name, 'SequelizeDatabaseError');
  assert.equal(log.error.code, 'ER_BAD_FIELD_ERROR');
  assert.match(log.error.message, /Unknown column/);
  assert.doesNotMatch(lines[0], /hunter2|access-token-value|query-secret|body-secret|device-secret/);
});

test('safe application errors preserve their public message and stable code', () => {
  const req = {
    requestId: 'req-safe-1',
    method: 'POST',
    path: '/api/orders',
    query: {},
    params: {},
    body: {},
  };
  const res = createResponse();
  const error = httpError('KHQR payments are temporarily unavailable. Please use cash.', 503, 'KHQR_DISABLED');

  captureStream(process.stderr, () => errorHandler(error, req, res, () => {}));

  assert.equal(res.statusCode, 503);
  assert.equal(res.body.message, error.message);
  assert.equal(res.body.code, 'KHQR_DISABLED');
});

test('request context accepts bounded IDs and replaces unsafe IDs', () => {
  const headers = {};
  const res = { set: (name, value) => { headers[name] = value; } };
  const validReq = { get: () => 'gateway.request-123' };
  requestContext(validReq, res, () => {});
  assert.equal(validReq.requestId, 'gateway.request-123');

  const invalidReq = { get: () => 'unsafe\nforged-log-line' };
  requestContext(invalidReq, res, () => {});
  assert.match(invalidReq.requestId, /^[0-9a-f-]{36}$/);
  assert.equal(headers['X-Request-ID'], invalidReq.requestId);
});

test('request completion logs are structured and redact nested input', () => {
  const req = {
    requestId: 'req-log-1',
    method: 'POST',
    path: '/api/auth/login',
    query: { source: 'terminal', secret: 'query-secret' },
    body: { username: 'owner', password: 'login-secret' },
    ip: '127.0.0.1',
  };
  const res = new EventEmitter();
  res.statusCode = 401;

  const lines = captureStream(process.stdout, () => {
    requestLogger(req, res, () => {});
    res.emit('finish');
  });

  const log = JSON.parse(lines[0]);
  assert.equal(log.event, 'http_request_completed');
  assert.equal(log.request_id, 'req-log-1');
  assert.equal(log.body.password, '********');
  assert.equal(log.query.secret, '********');
  assert.doesNotMatch(lines[0], /login-secret|query-secret/);
});

test('redaction handles circular diagnostic metadata safely', () => {
  const metadata = { password: 'secret', safe: 'visible' };
  metadata.self = metadata;
  assert.deepEqual(redactForLog(metadata), {
    password: '********',
    safe: 'visible',
    self: '[circular]',
  });
});
