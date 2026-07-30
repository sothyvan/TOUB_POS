import {
  listCashiersForDevice,
  loginUser,
  loginWithPin,
} from '../services/auth.service.js';
import {
  revokeAuthSession,
  rotateAuthSession,
} from '../services/auth-session.service.js';
import {
  clearAuthCookies,
  getCsrfTokenCookie,
  getRefreshTokenCookie,
  setAuthCookies,
} from '../utils/auth-cookie.util.js';

function getDeviceToken(req) {
  return req.headers['x-device-token'];
}

function getCsrfToken(req) {
  const headerToken = req.headers['x-csrf-token'];
  const cookieToken = getCsrfTokenCookie(req);
  return headerToken && cookieToken && headerToken === cookieToken ? headerToken : null;
}

function sendAuthSession(res, session) {
  setAuthCookies(res, session);
  return res.json({
    success: true,
    data: {
      token: session.token,
      csrfToken: session.csrfToken,
      user: session.user,
    },
  });
}

export async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'username and password are required.' });
    }
    const data = await loginUser(username, password);
    return sendAuthSession(res, data);
  } catch (err) {
    next(err);
  }
}

export async function loginPin(req, res, next) {
  try {
    const { userId, pin } = req.body;
    const deviceToken = getDeviceToken(req);
    if (!userId || !pin) {
      return res.status(400).json({ success: false, message: 'userId and pin are required.' });
    }
    if (!deviceToken) {
      return res.status(401).json({ success: false, code: 'DEVICE_REQUIRED', message: 'A registered terminal is required for PIN login.' });
    }
    const data = await loginWithPin(userId, pin, deviceToken);
    return sendAuthSession(res, data);
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const data = await rotateAuthSession({
      refreshToken: getRefreshTokenCookie(req),
      csrfToken: getCsrfToken(req),
      deviceToken: getDeviceToken(req),
    });
    return sendAuthSession(res, data);
  } catch (err) {
    if (err.status === 401) {
      clearAuthCookies(res);
    }
    return next(err);
  }
}

export async function logout(req, res, next) {
  try {
    await revokeAuthSession({
      refreshToken: getRefreshTokenCookie(req),
      csrfToken: getCsrfToken(req),
    });
    clearAuthCookies(res);
    return res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    return next(err);
  }
}

export async function getPublicCashiers(req, res, next) {
  try {
    const deviceToken = getDeviceToken(req);

    if (!deviceToken) {
      return res.status(400).json({ success: false, message: 'Device token is required.' });
    }

    const cashiers = await listCashiersForDevice(deviceToken);
    res.json({ success: true, data: cashiers });
  } catch (err) {
    next(err);
  }
}

export function getDeviceStatus(req, res) {
  res.json({
    success: true,
    data: {
      id: req.device.id,
      name: req.device.name,
      stall_id: req.device.stall_id,
      is_active: true,
    },
  });
}
