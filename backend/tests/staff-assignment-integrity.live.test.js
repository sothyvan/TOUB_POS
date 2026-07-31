import assert from 'node:assert/strict';
import test from 'node:test';
import { Op } from 'sequelize';
import {
  sequelize,
  Stall,
  StallStaff,
  User,
} from '../src/models/index.js';
import { assignStaffToStall } from '../src/repositories/stall.repository.js';

test('staff reassignment serializes competing writes and rolls back forced failures', async (t) => {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const created = { stallIds: [], userId: null };

  t.after(async () => {
    if (created.userId) {
      await StallStaff.destroy({ where: { user_id: created.userId } });
    }
    if (created.stallIds.length > 0) {
      await Stall.destroy({ where: { id: { [Op.in]: created.stallIds } }, force: true });
    }
    if (created.userId) {
      await User.destroy({ where: { id: created.userId }, force: true });
    }
    await sequelize.close();
  });

  const owner = await User.findOne({ where: { role: 'owner', is_deleted: false } });
  assert.ok(owner, 'The disposable integration database must contain the seeded Owner.');

  const cashier = await User.create({
    username: `assignment_test_${suffix}`,
    password: null,
    pin: '$2a$10$integration.only.placeholder.hash',
    role: 'cashier',
    owner_id: owner.id,
    is_active: true,
  });
  created.userId = cashier.id;

  const stalls = await Stall.bulkCreate([
    { owner_id: owner.id, name: `Assignment A ${suffix}`, location: 'Test' },
    { owner_id: owner.id, name: `Assignment B ${suffix}`, location: 'Test' },
  ]);
  created.stallIds = stalls.map((stall) => stall.id);
  const [stallA, stallB] = stalls;

  await assignStaffToStall(stallA.id, cashier.id);

  await assert.rejects(
    assignStaffToStall(stallB.id, cashier.id, {
      audit: () => {
        throw new Error('forced related-work failure');
      },
    }),
    /forced related-work failure/,
  );
  const afterFailure = await StallStaff.findAll({ where: { user_id: cashier.id } });
  assert.equal(afterFailure.length, 1);
  assert.equal(Number(afterFailure[0].stall_id), Number(stallA.id));

  await Promise.all([
    assignStaffToStall(stallB.id, cashier.id),
    assignStaffToStall(stallA.id, cashier.id),
  ]);

  const finalAssignments = await StallStaff.findAll({ where: { user_id: cashier.id } });
  assert.equal(finalAssignments.length, 1);
  assert.ok(
    [Number(stallA.id), Number(stallB.id)].includes(Number(finalAssignments[0].stall_id)),
    'The serialized final assignment must point to one requested Stall.',
  );
});

