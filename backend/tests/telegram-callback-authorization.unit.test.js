import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatUpgradeCompletionNotification,
  markTicketDone,
  processTelegramCallback,
} from '../src/services/telegram-callback.service.js';

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
  const harness = buildDependencies({ requestId: 'telegram-request-42' });

  await processTelegramCallback(buildUpdate(), harness.dependencies);

  assert.equal(harness.answers.length, 0);
  assert.equal(harness.completions.length, 1);
  const [ticket, order, cook, callbackId, chatId, messageId, timingContext] = harness.completions[0];
  assert.equal(ticket.id, 9);
  assert.equal(order.id, 42);
  assert.equal(cook.display_name, 'Kitchen Dara');
  assert.equal(callbackId, 'callback-1');
  assert.equal(chatId, -100500);
  assert.equal(messageId, 700);
  assert.equal(timingContext.requestId, 'telegram-request-42');
  assert.equal(typeof timingContext.workflowTimer.mark, 'function');
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

test('Telegram group-upgrade notification escapes the cook display name', () => {
  const message = formatUpgradeCompletionNotification(
    { id: 42 },
    'Cook <Admin> & Co',
  );

  assert.match(message, /<b>Order #42<\/b>/);
  assert.match(message, /<b>Cook &lt;Admin&gt; &amp; Co<\/b>/);
  assert.doesNotMatch(message, /Cook <Admin> & Co/);
});

test('concurrent Telegram Done completions edit and attribute a sent ticket once', async () => {
  const ticket = {
    id: 9,
    order_id: 42,
    telegram_chat_id: '-100500',
    telegram_msg_id: '700',
    status: 'sent',
    saveCalls: 0,
    save() {
      this.saveCalls += 1;
      return Promise.resolve();
    },
  };
  let transactionQueue = Promise.resolve();
  let transactionActive = false;
  let editCalls = 0;
  const runInTransaction = (work) => {
    const result = transactionQueue.then(async () => {
      transactionActive = true;
      try {
        return await work({ LOCK: { UPDATE: 'UPDATE' } });
      } finally {
        transactionActive = false;
      }
    });
    transactionQueue = result.catch(() => {});
    return result;
  };
  const atomicDependencies = {
    runInTransaction,
    findTicketForUpdate: () => Promise.resolve(ticket),
  };
  const dependencies = {
    atomicDependencies,
    editDone: () => {
      assert.equal(transactionActive, false);
      editCalls += 1;
      return Promise.resolve();
    },
    emitUpdate: () => {},
    answerQuery: () => Promise.resolve(),
    logInfo: () => {},
    recordTiming: () => {},
  };
  const order = {
    id: 42,
    stall_id: 5,
    cashier_id: 9,
    Stall: { owner_id: 1 },
  };
  const firstCook = {
    telegram_user_id: '111',
    display_name: 'First Cook',
  };
  const secondCook = {
    telegram_user_id: '222',
    display_name: 'Second Cook',
  };

  const outcomes = await Promise.all([
    markTicketDone(
      ticket,
      order,
      firstCook,
      'callback-1',
      -100500,
      700,
      dependencies,
    ),
    markTicketDone(
      ticket,
      order,
      secondCook,
      'callback-2',
      -100500,
      700,
      dependencies,
    ),
  ]);

  assert.deepEqual(outcomes.map(({ outcome }) => outcome), ['completed', 'already_done']);
  assert.equal(editCalls, 1);
  assert.equal(ticket.saveCalls, 1);
  assert.equal(ticket.status, 'done');
  assert.equal(ticket.completed_by_telegram_user_id, '111');
  assert.equal(ticket.completed_by_name, 'First Cook');
});

test('a post-commit Telegram edit failure keeps the authoritative completion', async () => {
  const ticket = {
    id: 9,
    order_id: 42,
    telegram_chat_id: '-100500',
    telegram_msg_id: '700',
    status: 'sent',
    save: () => Promise.resolve(),
  };
  const answers = [];
  const completion = await markTicketDone(
    ticket,
    { id: 42, stall_id: 5, cashier_id: 9, Stall: { owner_id: 1 } },
    { telegram_user_id: '111', display_name: 'First Cook' },
    'callback-1',
    -100500,
    700,
    {
      atomicDependencies: {
        runInTransaction: (work) => work({ LOCK: { UPDATE: 'UPDATE' } }),
        findTicketForUpdate: () => Promise.resolve(ticket),
      },
      editDone: () => Promise.reject(new Error('Telegram unavailable')),
      handleEditFailure: (error) => Promise.reject(error),
      emitUpdate: () => {},
      answerQuery: (_callbackId, message) => {
        answers.push(message);
        return Promise.resolve();
      },
      logError: () => {},
      logInfo: () => {},
      recordTiming: () => {},
    },
  );

  assert.equal(completion.outcome, 'completed');
  assert.equal(completion.telegramUpdate, 'failed');
  assert.equal(ticket.status, 'done');
  assert.equal(ticket.completed_by_telegram_user_id, '111');
  assert.match(answers[0], /recorded as done/i);
  assert.match(answers[0], /could not be updated/i);
});

test('Done completion records asynchronous database, Telegram, and callback timings', async () => {
  const ticket = {
    id: 15,
    order_id: 51,
    telegram_chat_id: '-100500',
    telegram_msg_id: '701',
    status: 'sent',
    sent_at: new Date('2026-08-05T12:00:00.000Z'),
    save: () => Promise.resolve(),
  };
  const readings = [0, 12, 172, 173, 218];
  let timingEvent;

  await markTicketDone(
    ticket,
    { id: 51, stall_id: 5, cashier_id: 9, Stall: { owner_id: 1 } },
    { telegram_user_id: '111', display_name: 'First Cook' },
    'callback-secret-id',
    -100500,
    701,
    {
      requestId: 'telegram-request-51',
      now: () => readings.shift(),
      atomicDependencies: {
        runInTransaction: (work) => work({ LOCK: { UPDATE: 'UPDATE' } }),
        findTicketForUpdate: () => Promise.resolve(ticket),
        completedAt: () => new Date('2026-08-05T12:03:00.000Z'),
      },
      editDone: () => Promise.resolve(),
      emitUpdate: () => {},
      answerQuery: () => Promise.resolve(),
      logInfo: () => {},
      recordTiming: (details) => {
        timingEvent = details;
      },
    },
  );

  assert.equal(timingEvent.workflow, 'telegram_done');
  assert.equal(timingEvent.requestId, 'telegram-request-51');
  assert.equal(timingEvent.orderId, 51);
  assert.equal(timingEvent.durationMs, 218);
  assert.deepEqual(timingEvent.timingsMs, {
    atomic_completion: 12,
    telegram_edit: 160,
    websocket_emit: 1,
    callback_answer: 45,
  });
  assert.deepEqual(timingEvent.agesMs, { ticket_sent_to_done: 180000 });
});
