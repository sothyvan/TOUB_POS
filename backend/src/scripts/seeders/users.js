import bcrypt from 'bcryptjs';
import { User } from '../../models/index.js';
import { CASHIER_PIN, OWNER_SEEDS } from './data.js';

export async function upsertUser({ username, role, password = null, pin = null, owner_id = null }) {
  const defaults = {
    username,
    role,
    password: password ? await bcrypt.hash(password, 10) : null,
    pin: pin ? await bcrypt.hash(pin, 10) : null,
    owner_id,
    is_active: true,
  };

  const [user, created] = await User.findOrCreate({
    where: { username },
    defaults,
  });

  if (!created) {
    const updates = {
      role,
      owner_id,
      is_active: true,
    };

    if (password) {
      updates.password = await bcrypt.hash(password, 10);
      updates.pin = null;
    }

    if (pin) {
      updates.password = null;
      updates.pin = await bcrypt.hash(pin, 10);
    }

    await user.update(updates);
  }

  return user;
}

export async function seedUsers() {
  const owners = [];
  const managers = [];
  const cashiers = [];

  for (const ownerSeed of OWNER_SEEDS) {
    const owner = await upsertUser({
      username: ownerSeed.username,
      role: 'owner',
      password: ownerSeed.password,
    });
    owners.push(owner);

    for (const managerSeed of ownerSeed.managers) {
      const manager = await upsertUser({
        username: managerSeed.username,
        role: 'manager',
        password: managerSeed.password,
        owner_id: owner.id,
      });
      managers.push(manager);
    }

    for (const cashierSeed of ownerSeed.cashiers) {
      const cashier = await upsertUser({
        username: cashierSeed.username,
        role: 'cashier',
        pin: CASHIER_PIN,
        owner_id: owner.id,
      });
      cashiers.push(cashier);
    }
  }

  return { owners, managers, cashiers };
}
