import assert from 'node:assert/strict';
import test from 'node:test';
import { Op } from 'sequelize';
import { sequelize, Stall, User } from '../src/models/index.js';

test('MySQL permits only one non-deleted Stall per Telegram kitchen chat', async (t) => {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const destinationChatId = `-100${suffix}`;
  const createdStallIds = [];

  t.after(async () => {
    if (createdStallIds.length > 0) {
      await Stall.destroy({
        where: { id: { [Op.in]: createdStallIds } },
        force: true,
      });
    }
    await sequelize.close();
  });

  const owner = await User.findOne({ where: { role: 'owner', is_deleted: false } });
  assert.ok(owner, 'The disposable integration database must contain the seeded Owner.');

  const stalls = await Stall.bulkCreate([
    {
      owner_id: owner.id,
      name: `Telegram uniqueness A ${suffix}`,
      location: 'Integration Test',
      telegram_chat_id: `-200${suffix}`,
    },
    {
      owner_id: owner.id,
      name: `Telegram uniqueness B ${suffix}`,
      location: 'Integration Test',
      telegram_chat_id: `-300${suffix}`,
    },
  ]);
  createdStallIds.push(...stalls.map((stall) => stall.id));

  const results = await Promise.allSettled(stalls.map((stall) => (
    stall.update({ telegram_chat_id: destinationChatId })
  )));

  assert.equal(results.filter(({ status }) => status === 'fulfilled').length, 1);
  assert.equal(results.filter(({ status }) => status === 'rejected').length, 1);
  const rejection = results.find(({ status }) => status === 'rejected').reason;
  assert.match(
    `${rejection?.name ?? ''} ${rejection?.original?.code ?? ''} ${rejection?.message ?? ''}`,
    /SequelizeUniqueConstraintError|ER_DUP_ENTRY|uq_stalls_active_telegram_chat_id/,
  );

  const connected = await Stall.findAll({
    where: {
      id: { [Op.in]: createdStallIds },
      telegram_chat_id: destinationChatId,
      is_deleted: false,
    },
  });
  assert.equal(connected.length, 1);

  const winner = connected[0];
  const loser = stalls.find((stall) => Number(stall.id) !== Number(winner.id));
  await winner.update({ is_deleted: true });
  await loser.reload();
  await loser.update({ telegram_chat_id: destinationChatId });

  const afterReuse = await Stall.findAll({
    where: {
      id: { [Op.in]: createdStallIds },
      telegram_chat_id: destinationChatId,
      is_deleted: false,
    },
  });
  assert.equal(afterReuse.length, 1);
  assert.equal(Number(afterReuse[0].id), Number(loser.id));
});
