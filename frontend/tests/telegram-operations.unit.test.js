import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  formatTelegramDuration,
  getTelegramHealthPresentation,
  getTelegramJobTiming,
} from '../src/utils/telegramOperations.js';

test('Telegram operations presentation formats latency and health safely', () => {
  assert.equal(formatTelegramDuration(null), 'No samples');
  assert.equal(formatTelegramDuration(850), '850ms');
  assert.equal(formatTelegramDuration(1240), '1.24s');
  assert.deepEqual(getTelegramHealthPresentation('critical'), {
    label: 'Needs immediate attention',
    tone: 'danger',
  });
  assert.deepEqual(getTelegramHealthPresentation('unknown'), {
    label: 'Status unavailable',
    tone: 'neutral',
  });
});

test('Telegram operations timing distinguishes automatic retry from stale work', () => {
  const now = new Date('2026-08-05T12:00:00.000Z');
  assert.equal(getTelegramJobTiming({
    status: 'retry',
    next_attempt_at: '2026-08-05T12:00:05.000Z',
  }, now), 'Automatic retry in 5s');
  assert.equal(getTelegramJobTiming({
    status: 'processing',
    is_stale: true,
    age_seconds: 90,
  }, now), 'Stale for 1m 30s');
});

test('Telegram operations panel uses the protected API and accessible alert semantics', async () => {
  const apiSource = await readFile(new URL('../src/services/api.js', import.meta.url), 'utf8');
  const panelSource = await readFile(
    new URL('../src/features/management/components/dashboard/TelegramOperationsPanel.jsx', import.meta.url),
    'utf8',
  );

  assert.match(apiSource, /operations\/telegram/);
  assert.match(panelSource, /role=\{.*alert.*status/s);
  assert.match(panelSource, /Kitchen delivery health/);
  assert.doesNotMatch(panelSource, /last_error|locked_by|telegram_chat_id|telegram_msg_id/);
});
