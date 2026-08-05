import assert from 'node:assert/strict';
import test from 'node:test';
import { enqueuePaidTransitionTelegramDispatch } from '../src/repositories/telegram-dispatch-job.repository.js';

test('paid transition enqueue uses one no-reset insert statement', async () => {
  const transaction = { id: 'payment-transaction' };
  const queuedAt = new Date('2026-08-05T10:00:00.000Z');
  const insertedJobs = [{ id: 31, order_id: 185, status: 'pending' }];
  const calls = [];
  const dispatchJobModel = {
    bulkCreate: (rows, options) => {
      calls.push({ rows, options });
      return Promise.resolve(insertedJobs);
    },
  };

  const result = await enqueuePaidTransitionTelegramDispatch(185, {
    transaction,
    dispatchJobModel,
    now: () => queuedAt,
  });

  assert.equal(result, insertedJobs);
  assert.deepEqual(calls, [{
    rows: [{
      order_id: 185,
      status: 'pending',
      attempt_count: 0,
      next_attempt_at: queuedAt,
    }],
    options: {
      transaction,
      updateOnDuplicate: ['order_id'],
    },
  }]);
  assert.equal(calls[0].options.updateOnDuplicate.includes('status'), false);
  assert.equal(calls[0].options.updateOnDuplicate.includes('attempt_count'), false);
  assert.equal(calls[0].options.updateOnDuplicate.includes('next_attempt_at'), false);
});

test('paid transition enqueue propagates insert failure to the payment transaction', async () => {
  const insertError = new Error('database unavailable');
  const dispatchJobModel = {
    bulkCreate: () => Promise.reject(insertError),
  };

  await assert.rejects(
    enqueuePaidTransitionTelegramDispatch(186, { dispatchJobModel }),
    (error) => error === insertError,
  );
});
