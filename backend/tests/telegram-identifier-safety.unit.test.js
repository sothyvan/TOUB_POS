import test from 'node:test';
import assert from 'node:assert/strict';
import {
  maskTelegramChatId,
  maskTelegramUserId,
  sanitizeOrderTelegramMetadata,
} from '../src/utils/telegram-identifier.util.js';

test('Telegram identifiers are masked without returning the complete value', () => {
  assert.equal(maskTelegramUserId('891900485'), '••••0485');
  assert.equal(maskTelegramChatId('-5432106978'), '-543••••6978');
  assert.equal(maskTelegramUserId(null), null);
  assert.equal(maskTelegramChatId(null), null);
});

test('Order response sanitization removes raw Telegram routing and actor identifiers', () => {
  const safeOrder = sanitizeOrderTelegramMetadata({
    id: 117,
    Stall: {
      id: 2,
      name: 'Stall B',
      telegram_chat_id: '-5432106978',
    },
    TelegramTickets: [{
      id: 8,
      status: 'done',
      telegram_chat_id: '-5432106978',
      telegram_msg_id: '42',
      completed_by_telegram_user_id: '891900485',
      completed_by_name: 'Van',
    }],
  });

  assert.equal(safeOrder.Stall.telegram_chat_id, undefined);
  assert.equal(safeOrder.TelegramTickets[0].telegram_chat_id, undefined);
  assert.equal(safeOrder.TelegramTickets[0].telegram_msg_id, undefined);
  assert.equal(safeOrder.TelegramTickets[0].completed_by_telegram_user_id, undefined);
  assert.equal(safeOrder.TelegramTickets[0].completed_by_name, 'Van');
});
