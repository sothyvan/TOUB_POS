import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { getDatabaseTlsOptions } from '../src/config/database-tls.js';

const TEST_CA = [
  '-----BEGIN CERTIFICATE-----',
  'test-provider-ca',
  '-----END CERTIFICATE-----',
].join('\n');

test('local development does not require database TLS configuration', () => {
  assert.equal(
    getDatabaseTlsOptions({ env: { NODE_ENV: 'development' } }),
    undefined,
  );
});

test('production fails closed when no database CA is configured', () => {
  assert.throws(
    () => getDatabaseTlsOptions({ env: { NODE_ENV: 'production' } }),
    /requires DB_SSL_CA_PATH or DB_SSL_CA/,
  );
});

test('database TLS rejects ambiguous CA configuration', () => {
  assert.throws(
    () => getDatabaseTlsOptions({
      env: {
        NODE_ENV: 'production',
        DB_SSL_CA: TEST_CA,
        DB_SSL_CA_PATH: './certs/ca.pem',
      },
    }),
    /Configure only one database CA source/,
  );
});

test('inline database CA enables strict certificate verification', () => {
  const options = getDatabaseTlsOptions({
    env: {
      NODE_ENV: 'production',
      DB_SSL_CA: TEST_CA.replace(/\n/g, '\\n'),
    },
  });

  assert.deepEqual(options, {
    require: true,
    rejectUnauthorized: true,
    ca: TEST_CA,
  });
});

test('database CA path is resolved and read without weakening verification', () => {
  let requestedPath;
  const deploymentDirectory = path.resolve('deployment', 'backend');
  const options = getDatabaseTlsOptions({
    env: {
      NODE_ENV: 'production',
      DB_SSL_CA_PATH: './certs/provider-ca.pem',
    },
    cwd: deploymentDirectory,
    readFile: (filePath, encoding) => {
      requestedPath = filePath;
      assert.equal(encoding, 'utf8');
      return TEST_CA;
    },
  });

  assert.equal(
    requestedPath,
    path.resolve(deploymentDirectory, 'certs', 'provider-ca.pem'),
  );
  assert.equal(options.rejectUnauthorized, true);
  assert.equal(options.ca, TEST_CA);
});

test('database TLS rejects content that is not a PEM certificate', () => {
  assert.throws(
    () => getDatabaseTlsOptions({
      env: {
        NODE_ENV: 'production',
        DB_SSL_CA: 'not-a-certificate',
      },
    }),
    /must be a PEM certificate/,
  );
});
