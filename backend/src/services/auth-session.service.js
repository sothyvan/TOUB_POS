import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { sequelize } from '../models/index.js';
import {
  createRefreshSession,
  findRefreshSessionByTokenHash,
  revokeRefreshFamily,
  revokeRefreshSession,
} from '../repositories/refresh-session.repository.js';
import { findDeviceByToken } from '../repositories/stall-device.repository.js';
import { findStaffAssignmentByUserId } from '../repositories/stall.repository.js';
import { findUserSessionById } from '../repositories/user.repository.js';
import { httpError } from '../utils/http-error.util.js';

const DEFAULT_ACCESS_TOKEN_EXPIRY = '15m';
const DEFAULT_REFRESH_SESSION_HOURS = 8;

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function randomToken() {
  return crypto.randomBytes(48).toString('base64url');
}

function safeHashEquals(rawValue, expectedHash) {
  const actualHash = sha256(rawValue);
  const actualBuffer = Buffer.from(actualHash, 'hex');
  const expectedBuffer = Buffer.from(String(expectedHash || ''), 'hex');
  return actualBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function refreshSessionHours() {
  return Number(process.env.REFRESH_SESSION_EXPIRES_HOURS || DEFAULT_REFRESH_SESSION_HOURS);
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    owner_id: user.owner_id,
  };
}

function accessClaims(user, deviceContext = null) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    owner_id: user.owner_id,
    session_version: user.session_version,
    ...(deviceContext ? {
      device_id: deviceContext.deviceId,
      stall_id: deviceContext.stallId,
    } : {}),
  };
}

function signAccessToken(user, deviceContext = null) {
  return jwt.sign(
    accessClaims(user, deviceContext),
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || DEFAULT_ACCESS_TOKEN_EXPIRY },
  );
}

async function resolveRefreshPrincipal(session, deviceToken, transaction) {
  const user = await findUserSessionById(session.user_id, { transaction });
  if (
    !user
    || user.is_deleted
    || !user.is_active
    || Number(user.session_version) !== Number(session.session_version)
  ) {
    return null;
  }

  if (user.role !== 'cashier') {
    if (session.device_id !== null) {
      return null;
    }
    return { user, deviceContext: null };
  }

  if (!deviceToken || !session.device_id) {
    return null;
  }

  const device = await findDeviceByToken(deviceToken);
  const assignment = await findStaffAssignmentByUserId(user.id, { transaction });
  if (
    !device
    || !device.Stall
    || device.Stall.is_deleted
    || !device.Stall.is_active
    || Number(device.id) !== Number(session.device_id)
    || !assignment
    || Number(assignment.stall_id) !== Number(device.stall_id)
  ) {
    return null;
  }

  return {
    user,
    deviceContext: {
      deviceId: Number(device.id),
      stallId: Number(device.stall_id),
    },
  };
}

function buildRefreshRecord(user, refreshToken, csrfToken, {
  familyId = crypto.randomUUID(),
  deviceContext = null,
  expiresAt = new Date(Date.now() + refreshSessionHours() * 60 * 60 * 1000),
} = {}) {
  return {
    record: {
      user_id: user.id,
      device_id: deviceContext?.deviceId ?? null,
      token_hash: sha256(refreshToken),
      csrf_token_hash: sha256(csrfToken),
      family_id: familyId,
      session_version: user.session_version,
      expires_at: expiresAt,
    },
    familyId,
    expiresAt,
  };
}

export async function createAuthSession(user, { deviceContext = null } = {}) {
  const refreshToken = randomToken();
  const csrfToken = randomToken();
  const { record, expiresAt } = buildRefreshRecord(user, refreshToken, csrfToken, {
    deviceContext,
  });

  await createRefreshSession(record);

  return {
    token: signAccessToken(user, deviceContext),
    user: publicUser(user),
    refreshToken,
    csrfToken,
    expiresAt,
  };
}

export async function rotateAuthSession({ refreshToken, csrfToken, deviceToken }) {
  if (!refreshToken) {
    throw httpError('Refresh session is required.', 401, 'REFRESH_REQUIRED');
  }
  if (!csrfToken) {
    throw httpError('CSRF token is required.', 403, 'CSRF_INVALID');
  }

  const outcome = await sequelize.transaction(async (transaction) => {
    const currentSession = await findRefreshSessionByTokenHash(sha256(refreshToken), {
      transaction,
      lock: true,
    });
    if (!currentSession) {
      return { error: httpError('Refresh session is invalid.', 401, 'REFRESH_INVALID') };
    }

    if (!safeHashEquals(csrfToken, currentSession.csrf_token_hash)) {
      throw httpError('CSRF token is invalid.', 403, 'CSRF_INVALID');
    }

    if (currentSession.revoked_at) {
      await revokeRefreshFamily(currentSession.family_id, { transaction });
      return {
        error: httpError(
          'Refresh token reuse was detected. Please sign in again.',
          401,
          'REFRESH_REUSED',
        ),
      };
    }

    if (new Date(currentSession.expires_at).getTime() <= Date.now()) {
      await revokeRefreshSession(currentSession.id, { transaction });
      return { error: httpError('Refresh session expired.', 401, 'REFRESH_EXPIRED') };
    }

    const principal = await resolveRefreshPrincipal(currentSession, deviceToken, transaction);
    if (!principal) {
      await revokeRefreshFamily(currentSession.family_id, { transaction });
      return {
        error: httpError(
          'Your account, device, or permissions changed. Please sign in again.',
          401,
          'SESSION_INVALIDATED',
        ),
      };
    }

    const nextRefreshToken = randomToken();
    const nextCsrfToken = randomToken();
    const { record, expiresAt } = buildRefreshRecord(
      principal.user,
      nextRefreshToken,
      nextCsrfToken,
      {
        familyId: currentSession.family_id,
        deviceContext: principal.deviceContext,
        expiresAt: currentSession.expires_at,
      },
    );

    await revokeRefreshSession(currentSession.id, {
      replacedByTokenHash: record.token_hash,
      transaction,
    });
    await createRefreshSession(record, { transaction });

    return {
      token: signAccessToken(principal.user, principal.deviceContext),
      user: publicUser(principal.user),
      refreshToken: nextRefreshToken,
      csrfToken: nextCsrfToken,
      expiresAt,
    };
  });

  if (outcome.error) {
    throw outcome.error;
  }
  return outcome;
}

export async function revokeAuthSession({ refreshToken, csrfToken }) {
  if (!refreshToken) {
    return;
  }
  if (!csrfToken) {
    throw httpError('CSRF token is required.', 403, 'CSRF_INVALID');
  }

  await sequelize.transaction(async (transaction) => {
    const session = await findRefreshSessionByTokenHash(sha256(refreshToken), {
      transaction,
      lock: true,
    });
    if (!session || session.revoked_at) {
      return;
    }
    if (!safeHashEquals(csrfToken, session.csrf_token_hash)) {
      throw httpError('CSRF token is invalid.', 403, 'CSRF_INVALID');
    }
    await revokeRefreshSession(session.id, { transaction });
  });
}
