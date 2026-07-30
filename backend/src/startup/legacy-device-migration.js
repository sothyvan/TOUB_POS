import { Op } from 'sequelize';
import { Stall } from '../models/index.js';
import { findOrCreateMigratedDevice } from '../repositories/stall-device.repository.js';

export async function migrateLegacyStallDeviceTokens() {
  const stalls = await Stall.findAll({
    where: { device_token: { [Op.ne]: null } },
    attributes: ['id', 'name', 'device_token'],
  });

  for (const stall of stalls) {
    await findOrCreateMigratedDevice({
      stallId: stall.id,
      stallName: stall.name,
      token: stall.device_token,
    });
    await stall.update({ device_token: null });
  }

  return stalls.length;
}
