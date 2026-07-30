import test from 'node:test';
import assert from 'node:assert/strict';
import { processTelegramGroupConnection } from '../src/services/telegram-group-connection.service.js';

const RAW_TOKEN = 'abcdefghijklmnopqrstuvwx12345678';

function buildUpdate(overrides = {}) {
  return {
    message: {
      text: `/start ${RAW_TOKEN}`,
      from: { id: 123456789 },
      chat: {
        id: -100500,
        title: 'Stall A Kitchen',
        type: 'supergroup',
      },
      ...overrides,
    },
  };
}

function buildHarness(consumeResult) {
  const consumeCalls = [];
  const emitted = [];
  const messages = [];
  return {
    consumeCalls,
    emitted,
    messages,
    dependencies: {
      consumeConnection: (payload) => {
        consumeCalls.push(payload);
        return Promise.resolve(consumeResult);
      },
      emitManagementUpdate: (payload) => emitted.push(payload),
      sendMessage: (chatId, message) => {
        messages.push({ chatId, message });
        return Promise.resolve();
      },
    },
  };
}

test('Telegram startgroup message consumes a hashed token and connects the selected stall', async () => {
  const harness = buildHarness({
    outcome: 'connected',
    stall: {
      id: 5,
      owner_id: 1,
      name: 'Stall A',
    },
  });

  const handled = await processTelegramGroupConnection(buildUpdate(), harness.dependencies);

  assert.equal(handled, true);
  assert.equal(harness.consumeCalls.length, 1);
  assert.equal(harness.consumeCalls[0].tokenHash.length, 64);
  assert.notEqual(harness.consumeCalls[0].tokenHash, RAW_TOKEN);
  assert.equal(harness.consumeCalls[0].chatId, -100500);
  assert.equal(harness.emitted.length, 1);
  assert.equal(harness.emitted[0].stallId, 5);
  assert.match(harness.messages[0].message, /connected to/);
});

test('Telegram group connection rejects use in a private chat before consuming the token', async () => {
  const harness = buildHarness({ outcome: 'connected' });
  const update = buildUpdate({
    chat: {
      id: 123456789,
      type: 'private',
    },
  });

  const handled = await processTelegramGroupConnection(update, harness.dependencies);

  assert.equal(handled, true);
  assert.equal(harness.consumeCalls.length, 0);
  assert.match(harness.messages[0].message, /inside a Telegram group/);
});

test('Telegram group connection reports an expired token without emitting a management update', async () => {
  const harness = buildHarness({ outcome: 'expired' });

  await processTelegramGroupConnection(buildUpdate(), harness.dependencies);

  assert.equal(harness.emitted.length, 0);
  assert.match(harness.messages[0].message, /expired/);
});
