import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const blueprintPath = new URL('../../render.yaml', import.meta.url);

function readBlueprint() {
  return readFile(blueprintPath, 'utf8');
}

test('Render blueprint keeps the production topology and safety controls', async () => {
  const blueprint = await readBlueprint();

  assert.match(blueprint, /type: keyvalue[\s\S]*name: toub-pos-rate-limit/);
  assert.match(blueprint, /type: web[\s\S]*name: toub-pos-api[\s\S]*runtime: node/);
  assert.match(blueprint, /rootDir: backend/);
  assert.match(blueprint, /preDeployCommand: npm run db:migrate/);
  assert.match(blueprint, /healthCheckPath: \/api\/health\/ready/);
  assert.match(blueprint, /maxShutdownDelaySeconds: 20/);
  assert.match(blueprint, /property: connectionString/);

  assert.match(blueprint, /name: toub-pos-web[\s\S]*runtime: static/);
  assert.match(blueprint, /rootDir: frontend/);
  assert.match(blueprint, /npm ci && npm run deps:check && npm run build/);
  assert.match(blueprint, /source: \/\*[\s\S]*destination: \/index\.html/);

  assert.match(blueprint, /key: KHQR_ENABLED\s+value: "false"/);
  assert.match(blueprint, /key: VITE_KHQR_ENABLED\s+value: "false"/);
  assert.match(blueprint, /key: API_DOCS_ENABLED\s+value: "false"/);
});

test('Render blueprint prompts for deployment secrets instead of storing them', async () => {
  const blueprint = await readBlueprint();
  const promptedKeys = [
    'FRONTEND_ORIGIN',
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'DB_SSL_CA',
    'TRUST_PROXY_HOPS',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_WEBHOOK_SECRET',
    'IMAGEKIT_PUBLIC_KEY',
    'IMAGEKIT_PRIVATE_KEY',
    'IMAGEKIT_URL_ENDPOINT',
    'VITE_API_BASE_URL',
  ];

  for (const key of promptedKeys) {
    assert.match(
      blueprint,
      new RegExp(`key: ${key}\\s+sync: false`),
      `${key} must be entered through Render`,
    );
  }

  assert.match(blueprint, /key: JWT_SECRET\s+generateValue: true/);
  assert.doesNotMatch(blueprint, /change_this|replace_with|your_password|owner123|platform123/);
});
