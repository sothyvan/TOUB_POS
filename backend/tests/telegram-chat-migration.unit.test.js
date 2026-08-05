import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { migrateTelegramChatRouting as migrateRoutingRepository } from '../src/repositories/telegram-chat-migration.repository.js';
import { migrateTelegramChatRouting } from '../src/services/telegram-chat-migration.service.js';

test('Telegram chat migration is stall-scoped and writes a masked system audit', async () => {
  let captured;
  const result = await migrateTelegramChatRouting({
    stallId: 5,
    oldChatId: '-1001234567890',
    newChatId: '-1009876543210',
  }, {
    migrateRouting: async (payload) => {
      captured = payload;
      const transaction = { id: 'tx-1' };
      const stall = { id: 5, owner_id: 3 };
      await payload.audit({ transaction, stall, updatedTicketCount: 2 });
      return { outcome: 'migrated', stall, updatedTicketCount: 2 };
    },
    writeAudit: (payload) => {
      captured.auditPayload = payload;
      return Promise.resolve();
    },
  });

  assert.equal(result.outcome, 'migrated');
  assert.equal(captured.stallId, 5);
  assert.equal(captured.oldChatId, '-1001234567890');
  assert.equal(captured.newChatId, '-1009876543210');
  assert.equal(captured.auditPayload.actor, null);
  assert.equal(captured.auditPayload.ownerId, 3);
  assert.equal(captured.auditPayload.action, 'telegram_group.chat_migrated');
  assert.equal(captured.auditPayload.targetId, 5);
  assert.deepEqual(captured.auditPayload.before, {
    chat_id_masked: '-100••••7890',
  });
  assert.deepEqual(captured.auditPayload.after, {
    chat_id_masked: '-100••••3210',
    active_ticket_count: 2,
  });
  assert.equal(captured.auditPayload.transaction.id, 'tx-1');
});

test('Telegram chat migration updates only the exact stall and its active tickets', async () => {
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const stall = {
    id: 5,
    owner_id: 3,
    telegram_chat_id: '-100111',
    updateCalls: [],
    update(values, options) {
      this.updateCalls.push({ values, options });
      this.telegram_chat_id = values.telegram_chat_id;
      return Promise.resolve(this);
    },
  };
  const tickets = [
    {
      id: 10,
      telegram_chat_id: '-100111',
      update(values, options) {
        this.telegram_chat_id = values.telegram_chat_id;
        this.options = options;
        return Promise.resolve(this);
      },
    },
    {
      id: 11,
      telegram_chat_id: '-100111',
      update(values, options) {
        this.telegram_chat_id = values.telegram_chat_id;
        this.options = options;
        return Promise.resolve(this);
      },
    },
  ];
  const calls = [];

  const result = await migrateRoutingRepository({
    stallId: 5,
    oldChatId: '-100111',
    newChatId: '-100222',
    audit: (payload) => {
      calls.push(['audit', payload]);
      return Promise.resolve();
    },
  }, {
    runInTransaction: (work) => work(transaction),
    findStallForUpdate: (stallId, passedTransaction) => {
      calls.push(['stall', stallId, passedTransaction]);
      return Promise.resolve(stall);
    },
    findConflictingStall: (stallId, newChatId, passedTransaction) => {
      calls.push(['conflict', stallId, newChatId, passedTransaction]);
      return Promise.resolve(null);
    },
    findActiveTicketsForUpdate: (stallId, oldChatId, passedTransaction) => {
      calls.push(['tickets', stallId, oldChatId, passedTransaction]);
      return Promise.resolve(tickets);
    },
  });

  assert.equal(result.outcome, 'migrated');
  assert.equal(result.updatedTicketCount, 2);
  assert.equal(stall.telegram_chat_id, '-100222');
  assert.equal(stall.updateCalls.length, 1);
  assert.equal(stall.updateCalls[0].options.transaction, transaction);
  assert.ok(tickets.every((ticket) => ticket.telegram_chat_id === '-100222'));
  assert.ok(tickets.every((ticket) => ticket.options.transaction === transaction));
  assert.equal(calls.filter(([name]) => name === 'audit').length, 1);
  assert.equal(calls.find(([name]) => name === 'stall')[1], 5);
  assert.deepEqual(calls.find(([name]) => name === 'tickets').slice(1, 3), [5, '-100111']);
});

test('Telegram chat migration rejects a destination used by another active stall', async () => {
  const stall = {
    id: 5,
    owner_id: 3,
    telegram_chat_id: '-100111',
    update: () => assert.fail('stall must not update on conflict'),
  };

  await assert.rejects(
    migrateRoutingRepository({
      stallId: 5,
      oldChatId: '-100111',
      newChatId: '-100222',
      audit: () => assert.fail('audit must not run on conflict'),
    }, {
      runInTransaction: (work) => work({ LOCK: { UPDATE: 'UPDATE' } }),
      findStallForUpdate: () => Promise.resolve(stall),
      findConflictingStall: () => Promise.resolve({ id: 8 }),
      findActiveTicketsForUpdate: () => assert.fail('tickets must not load on conflict'),
    }),
    (error) => error.code === 'TELEGRAM_CHAT_MIGRATION_CONFLICT',
  );
});

test('Telegram chat migration rolls back routing when its audit write fails', async () => {
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const stall = {
    id: 5,
    owner_id: 3,
    telegram_chat_id: '-100111',
    update(values) {
      this.telegram_chat_id = values.telegram_chat_id;
      return Promise.resolve(this);
    },
  };
  const ticket = {
    telegram_chat_id: '-100111',
    update(values) {
      this.telegram_chat_id = values.telegram_chat_id;
      return Promise.resolve(this);
    },
  };
  const runInTransaction = async (work) => {
    const snapshot = {
      stallChatId: stall.telegram_chat_id,
      ticketChatId: ticket.telegram_chat_id,
    };
    try {
      return await work(transaction);
    } catch (error) {
      stall.telegram_chat_id = snapshot.stallChatId;
      ticket.telegram_chat_id = snapshot.ticketChatId;
      throw error;
    }
  };

  await assert.rejects(
    migrateRoutingRepository({
      stallId: 5,
      oldChatId: '-100111',
      newChatId: '-100222',
      audit: () => Promise.reject(new Error('audit unavailable')),
    }, {
      runInTransaction,
      findStallForUpdate: () => Promise.resolve(stall),
      findConflictingStall: () => Promise.resolve(null),
      findActiveTicketsForUpdate: () => Promise.resolve([ticket]),
    }),
    /audit unavailable/,
  );

  assert.equal(stall.telegram_chat_id, '-100111');
  assert.equal(ticket.telegram_chat_id, '-100111');
});

test('low-level Telegram API helper does not perform a broad stall chat update', async () => {
  const source = await readFile(new URL('../src/services/telegram.service.js', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /Stall\.update\([\s\S]*telegram_chat_id/);
  assert.match(source, /migrateTelegramChatRouting/);
});
