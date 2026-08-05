import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDoneMessage,
  formatOrderMessage,
} from '../src/services/telegram.service.js';
import { escapeTelegramHtml } from '../src/utils/telegram-html.util.js';

function buildOrder() {
  return {
    id: 42,
    stall_id: 5,
    cashier_id: 9,
    created_at: '2026-08-05T03:15:00.000Z',
    payment_method: 'cash',
    pricing_currency: 'usd',
    total_usd: 12.5,
    Stall: { name: 'East & <West>' },
    Cashier: { username: 'Sam <Lead> & Co' },
    Items: [{
      quantity: 2,
      name: 'Tea <b>bold</b> & more',
      notes: 'no <ice> & "sugar"',
    }],
  };
}

test('Telegram HTML escaping encodes text-significant characters only', () => {
  assert.equal(
    escapeTelegramHtml('A & <B> "quoted"'),
    'A &amp; &lt;B&gt; "quoted"',
  );
  assert.equal(escapeTelegramHtml(null), '');
});

test('kitchen ticket escapes untrusted values while retaining trusted markup', () => {
  const message = formatOrderMessage(buildOrder());

  assert.match(message, /^🍽 <b>Order #42<\/b>/);
  assert.match(message, /East &amp; &lt;West&gt;/);
  assert.match(message, /Sam &lt;Lead&gt; &amp; Co/);
  assert.match(message, /Tea &lt;b&gt;bold&lt;\/b&gt; &amp; more/);
  assert.match(message, /<i>no &lt;ice&gt; &amp; "sugar"<\/i>/);
  assert.doesNotMatch(message, /East & <West>/);
  assert.doesNotMatch(message, /Tea <b>bold<\/b>/);
});

test('completed kitchen ticket escapes the cook display name', () => {
  const message = formatDoneMessage(buildOrder(), 'Cook <Admin> & Co');

  assert.match(message, /<b>Completed by Cook &lt;Admin&gt; &amp; Co at \d{2}:\d{2}<\/b>/);
  assert.doesNotMatch(message, /Cook <Admin> & Co/);
});
