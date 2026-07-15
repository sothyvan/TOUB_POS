/* eslint-disable no-console */
import 'dotenv/config';
import { faker } from '@faker-js/faker';
import sequelize, { ensureDatabaseExists } from '../config/db.js';
import { seedUsers } from './seeders/users.js';
import { seedStalls } from './seeders/stalls.js';
import { seedMenu } from './seeders/menu.js';
import { seedOrders } from './seeders/orders.js';
import { CASHIER_PIN, OWNER_SEEDS } from './seeders/data.js';

async function main() {
  faker.seed(20260705);

  await ensureDatabaseExists();
  await sequelize.authenticate();
  const syncOptions = process.env.NODE_ENV === 'development' ? { alter: true } : {};
  await sequelize.sync(syncOptions);

  console.log('[seed] Database connection established.');

  // Step 1: Users (Owners, Managers, Cashiers)
  console.log('[seed] Seeding user accounts...');
  const { owners, cashiers } = await seedUsers();

  // Step 2: Stalls and assignments
  console.log('[seed] Seeding stalls and assigning staff...');
  const stallsByName = await seedStalls(owners, cashiers);

  // Step 3: Categories, Products, and Stall-Product visibility/prices
  console.log('[seed] Seeding menu catalog...');
  await seedMenu(owners);

  // Step 4: Generate fake order history
  console.log('[seed] Generating order history...');
  await seedOrders(cashiers, stallsByName);

  console.log('[seed] Demo data ready.');
  for (const ownerSeed of OWNER_SEEDS) {
    const relatedCashiers = ownerSeed.cashiers.map((c) => c.username).join(', ');
    const managerUsername = ownerSeed.managers[0]?.username || 'N/A';
    const managerPassword = ownerSeed.managers[0]?.password || 'N/A';
    console.log(`[seed] Owner: ${ownerSeed.username} / ${ownerSeed.password}`);
    console.log(`[seed]   Manager: ${managerUsername} / ${managerPassword}`);
    console.log(`[seed]   Cashiers: ${relatedCashiers} / PIN ${CASHIER_PIN}`);
  }
}

main()
  .catch((error) => {
    console.error('[seed] Failed to seed demo data:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
