import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTelegramRetryDelayMs } from '../src/services/telegram-dispatch-worker.service.js';

test('Telegram dispatch retry delay grows exponentially and is capped', () => {
  assert.equal(calculateTelegramRetryDelayMs(1, 5000), 5000);
  assert.equal(calculateTelegramRetryDelayMs(2, 5000), 10000);
  assert.equal(calculateTelegramRetryDelayMs(3, 5000), 20000);
  assert.equal(calculateTelegramRetryDelayMs(20, 5000), 300000);
});
