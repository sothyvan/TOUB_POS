import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getApiContentSecurityPolicy,
  getApiDocsConfiguration,
  getSwaggerContentSecurityPolicy,
} from '../src/config/security.config.js';
import { requireApiDocsAuthentication } from '../src/middleware/api-docs.middleware.js';

function createResponse() {
  return {
    headers: {},
    statusCode: null,
    body: null,
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
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

test('API documentation defaults on in development and off in production', () => {
  assert.equal(getApiDocsConfiguration({ NODE_ENV: 'development' }).enabled, true);
  assert.deepEqual(getApiDocsConfiguration({ NODE_ENV: 'production' }), {
    enabled: false,
    requireAuthentication: false,
    username: null,
    password: null,
  });
});

test('production documentation cannot be enabled without separate credentials', () => {
  assert.throws(
    () => getApiDocsConfiguration({ NODE_ENV: 'production', API_DOCS_ENABLED: 'true' }),
    /API_DOCS_USERNAME and API_DOCS_PASSWORD/,
  );
  assert.deepEqual(getApiDocsConfiguration({
    NODE_ENV: 'production',
    API_DOCS_ENABLED: 'true',
    API_DOCS_USERNAME: 'docs_operator',
    API_DOCS_PASSWORD: 'test-only-password',
  }), {
    enabled: true,
    requireAuthentication: true,
    username: 'docs_operator',
    password: 'test-only-password',
  });
  assert.throws(
    () => getApiDocsConfiguration({
      NODE_ENV: 'production',
      API_DOCS_ENABLED: 'true',
      API_DOCS_USERNAME: 'docs_operator',
      API_DOCS_PASSWORD: 'too-short',
    }),
    /at least 16 characters/,
  );
});

test('API CSP denies browser content while the isolated Swagger policy is explicit', () => {
  const apiPolicy = getApiContentSecurityPolicy();
  const swaggerPolicy = getSwaggerContentSecurityPolicy();
  assert.deepEqual(apiPolicy.defaultSrc, ["'none'"]);
  assert.deepEqual(apiPolicy.frameAncestors, ["'none'"]);
  assert.deepEqual(apiPolicy.scriptSrc, ["'none'"]);
  assert.deepEqual(apiPolicy.styleSrc, ["'none'"]);
  assert.deepEqual(swaggerPolicy.scriptSrc, ["'self'"]);
  assert.deepEqual(swaggerPolicy.objectSrc, ["'none'"]);
  assert.equal(swaggerPolicy.scriptSrc.includes('*'), false);
});

test('production documentation authentication rejects missing credentials and accepts an exact match', () => {
  const middleware = requireApiDocsAuthentication({
    requireAuthentication: true,
    username: 'docs_operator',
    password: 'test-only-password',
  });
  const rejectedResponse = createResponse();
  middleware(
    { requestId: 'docs-request-1', get: () => null },
    rejectedResponse,
    () => assert.fail('Missing credentials must not continue.'),
  );
  assert.equal(rejectedResponse.statusCode, 401);
  assert.equal(rejectedResponse.body.code, 'API_DOCS_AUTH_REQUIRED');
  assert.equal(rejectedResponse.headers['Cache-Control'], 'no-store');

  let continued = false;
  middleware(
    {
      get: () => `Basic ${Buffer.from('docs_operator:test-only-password').toString('base64')}`,
    },
    createResponse(),
    () => { continued = true; },
  );
  assert.equal(continued, true);
});
