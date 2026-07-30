import { Op } from 'sequelize';
import { RefreshSession } from '../models/index.js';

export function createRefreshSession(data, { transaction } = {}) {
  return RefreshSession.create(data, { transaction });
}

export function findRefreshSessionByTokenHash(tokenHash, { transaction, lock = false } = {}) {
  return RefreshSession.findOne({
    where: { token_hash: tokenHash },
    transaction,
    ...(lock && transaction ? { lock: transaction.LOCK.UPDATE } : {}),
  });
}

export function revokeRefreshSession(
  id,
  { replacedByTokenHash = null, usedAt = new Date(), transaction } = {},
) {
  return RefreshSession.update({
    revoked_at: new Date(),
    last_used_at: usedAt,
    replaced_by_token_hash: replacedByTokenHash,
  }, {
    where: { id, revoked_at: null },
    transaction,
  });
}

export function revokeRefreshFamily(familyId, { transaction } = {}) {
  return RefreshSession.update({
    revoked_at: new Date(),
  }, {
    where: { family_id: familyId, revoked_at: null },
    transaction,
  });
}

export function revokeUserRefreshSessions(userId, { transaction } = {}) {
  return RefreshSession.update({
    revoked_at: new Date(),
  }, {
    where: { user_id: userId, revoked_at: null },
    transaction,
  });
}

export function revokeDeviceRefreshSessions(deviceId, { transaction } = {}) {
  return RefreshSession.update({
    revoked_at: new Date(),
  }, {
    where: { device_id: deviceId, revoked_at: null },
    transaction,
  });
}

export function deleteExpiredRefreshSessions({ before = new Date(), transaction } = {}) {
  return RefreshSession.destroy({
    where: {
      expires_at: { [Op.lt]: before },
    },
    transaction,
  });
}
