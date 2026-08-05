import { Op } from 'sequelize';
import { sequelize, TelegramDispatchJob } from '../models/index.js';

const CLAIMABLE_STATUSES = ['pending', 'retry'];

export function enqueueTelegramDispatch(orderId, { transaction } = {}) {
  return TelegramDispatchJob.findOrCreate({
    where: { order_id: orderId },
    defaults: {
      order_id: orderId,
      status: 'pending',
      next_attempt_at: new Date(),
    },
    transaction,
  });
}

export function enqueuePaidTransitionTelegramDispatch(orderId, {
  transaction,
  dispatchJobModel = TelegramDispatchJob,
  now = () => new Date(),
} = {}) {
  return dispatchJobModel.bulkCreate([{
    order_id: orderId,
    status: 'pending',
    attempt_count: 0,
    next_attempt_at: now(),
  }], {
    transaction,
    updateOnDuplicate: ['order_id'],
  });
}

export function findTelegramDispatchJobByOrderId(orderId, { transaction } = {}) {
  return TelegramDispatchJob.findOne({
    where: { order_id: orderId },
    transaction,
  });
}

export function claimNextTelegramDispatchJob({
  workerId,
  lockTimeoutMs,
  transaction: suppliedTransaction,
} = {}) {
  const claim = async (transaction) => {
    const now = new Date();
    const staleBefore = new Date(now.getTime() - lockTimeoutMs);
    const job = await TelegramDispatchJob.findOne({
      where: {
        [Op.or]: [
          {
            status: { [Op.in]: CLAIMABLE_STATUSES },
            next_attempt_at: { [Op.lte]: now },
          },
          {
            status: 'processing',
            locked_at: { [Op.lt]: staleBefore },
          },
        ],
      },
      order: [
        ['next_attempt_at', 'ASC'],
        ['id', 'ASC'],
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
      skipLocked: true,
    });

    if (!job) {
      return null;
    }

    job.status = 'processing';
    job.attempt_count += 1;
    job.last_attempt_at = now;
    job.locked_at = now;
    job.locked_by = workerId;
    await job.save({ transaction });
    return job;
  };

  if (suppliedTransaction) {
    return claim(suppliedTransaction);
  }
  return sequelize.transaction(claim);
}

export function saveTelegramDispatchJob(job, values) {
  Object.assign(job, values);
  return job.save();
}

export function requeueTelegramDispatchJob(orderId) {
  return sequelize.transaction(async (transaction) => {
    const job = await TelegramDispatchJob.findOne({
      where: { order_id: orderId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!job) {
      const [createdJob] = await enqueueTelegramDispatch(orderId, { transaction });
      return { job: createdJob, requeued: true };
    }

    if (job.status !== 'failed') {
      return { job, requeued: false };
    }

    job.status = 'pending';
    job.attempt_count = 0;
    job.next_attempt_at = new Date();
    job.last_attempt_at = null;
    job.locked_at = null;
    job.locked_by = null;
    job.last_error = null;
    await job.save({ transaction });
    return { job, requeued: true };
  });
}
