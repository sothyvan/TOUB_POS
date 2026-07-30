import test from 'node:test';
import assert from 'node:assert/strict';
import { processTelegramCallback } from '../src/services/telegram-callback.service.js';

function buildUpdate(overrides = {}) {
  return {
    callback_query: {
      id: 'callback-1',
      data: 'done:42',
      from: { id: 123456789, first_name: 'Dara' },
      message: {
        message_id: 700,
        chat: { id: -100500 },
      },
      ...overrides,
    },
  };
}

function buildDependencies(overrides = {}) {
  const answers = [];
  const completions = [];
  return {
    answers,
    completions,
    dependencies: {
      answerCallbackQuery: (_callbackId, message) => {
        answers.push(message);
        return Promise.resolve();
      },
      findTicket: () => Promise.resolve({
        id: 9,
        order_id: 42,
        telegram_chat_id: '-100500',
        telegram_msg_id: '700',
        status: 'sent',
      }),
      findOrder: () => Promise.resolve({
        id: 42,
        stall_id: 5,
        status: 'paid',
        Stall: {
          id: 5,
          owner_id: 1,
          telegram_chat_id: '-100500',
        },
      }),
      findActiveCook: () => Promise.resolve({
        id: 3,
        stall_id: 5,
        telegram_user_id: '123456789',
        display_name: 'Kitchen Dara',
        is_active: true,
      }),
      completeTicket: (...args) => {
        completions.push(args);
        return Promise.resolve();
      },
      ...overrides,
    },
  };
}

test('Telegram Done callback rejects a ticket from a different chat or message', async () => {
  const harness = buildDependencies({
    findTicket: () => Promise.resolve({
      id: 9,
      order_id: 42,
      telegram_chat_id: '-100999',
      telegram_msg_id: '700',
      status: 'sent',
    }),
  });

  await processTelegramCallback(buildUpdate(), harness.dependencies);

  assert.deepEqual(harness.answers, ['Ticket not found.']);
  assert.equal(harness.completions.length, 0);
});

test('Telegram Done callback rejects a Telegram user not authorized for the stall', async () => {
  const harness = buildDependencies({
    findActiveCook: () => Promise.resolve(null),
  });

  await processTelegramCallback(buildUpdate(), harness.dependencies);

  assert.match(harness.answers[0], /Not authorized for this stall/);
  assert.match(harness.answers[0], /123456789/);
  assert.equal(harness.completions.length, 0);
});

test('Telegram Done callback accepts an active cook assigned to the ticket stall', async () => {
  const harness = buildDependencies();

  await processTelegramCallback(buildUpdate(), harness.dependencies);

  assert.equal(harness.answers.length, 0);
  assert.equal(harness.completions.length, 1);
  const [ticket, order, cook, callbackId, chatId, messageId] = harness.completions[0];
  assert.equal(ticket.id, 9);
  assert.equal(order.id, 42);
  assert.equal(cook.display_name, 'Kitchen Dara');
  assert.equal(callbackId, 'callback-1');
  assert.equal(chatId, -100500);
  assert.equal(messageId, 700);
});

test('Telegram Done callback rejects unpaid orders before completion', async () => {
  const harness = buildDependencies({
    findOrder: () => Promise.resolve({
      id: 42,
      stall_id: 5,
      status: 'pending_payment',
      Stall: {
        id: 5,
        owner_id: 1,
        telegram_chat_id: '-100500',
      },
    }),
  });

  await processTelegramCallback(buildUpdate(), harness.dependencies);

  assert.deepEqual(harness.answers, ['Only paid orders can be completed.']);
  assert.equal(harness.completions.length, 0);
});
