import { Stall, StallStaff } from '../../models/index.js';
import { OWNER_SEEDS } from './data.js';

export async function upsertStall(seed, ownerId) {
  const [stall, created] = await Stall.findOrCreate({
    where: { name: seed.name },
    defaults: {
      ...seed,
      owner_id: ownerId,
    },
  });

  if (!created) {
    await stall.update({
      owner_id: ownerId,
      location: seed.location,
    });
  }

  return stall;
}

export async function assignCashiers(cashiers, stallsByName) {
  for (const ownerSeed of OWNER_SEEDS) {
    for (const cashierSeed of ownerSeed.cashiers) {
      const cashier = cashiers.find((user) => user.username === cashierSeed.username);
      const stall = stallsByName.get(cashierSeed.stallName);

      if (!cashier || !stall) {
        continue;
      }

      await StallStaff.destroy({ where: { user_id: cashier.id } });
      await StallStaff.findOrCreate({
        where: {
          stall_id: stall.id,
          user_id: cashier.id,
        },
        defaults: {
          stall_id: stall.id,
          user_id: cashier.id,
        },
      });
    }
  }
}

export async function seedStalls(owners, cashiers) {
  const stallsByName = new Map();

  for (const ownerSeed of OWNER_SEEDS) {
    const owner = owners.find((o) => o.username === ownerSeed.username);
    if (!owner) {
      continue;
    }

    for (const stallSeed of ownerSeed.stalls) {
      const stall = await upsertStall(stallSeed, owner.id);
      stallsByName.set(stall.name, stall);
    }
  }

  await assignCashiers(cashiers, stallsByName);

  return stallsByName;
}
