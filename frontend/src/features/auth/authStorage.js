const LEGACY_AUTH_STORAGE_KEYS = {
  TOKEN: 'toub-auth-token',
  USER: 'toub-current-user',
};
const LOGOUT_PENDING_KEY = 'toub-auth-logout-pending';
const CSRF_STORAGE_KEY = 'toub-auth-csrf-token';

export const DEVICE_STORAGE_KEYS = {
  TOKEN: 'toub-device-token',
  STALL: 'toub-device-stall',
  DEVICE: 'toub-device-info',
  REGISTERED: 'toub-device-registered',
};

export function clearStoredSession({ preserveCsrf = false } = {}) {
  localStorage.removeItem(LEGACY_AUTH_STORAGE_KEYS.TOKEN);
  localStorage.removeItem(LEGACY_AUTH_STORAGE_KEYS.USER);
  if (!preserveCsrf) {
    localStorage.removeItem(CSRF_STORAGE_KEY);
  }
}

export function readStoredCsrfToken() {
  return localStorage.getItem(CSRF_STORAGE_KEY);
}

export function writeStoredCsrfToken(token) {
  if (token) {
    localStorage.setItem(CSRF_STORAGE_KEY, token);
  }
}

export function clearStoredCsrfToken() {
  localStorage.removeItem(CSRF_STORAGE_KEY);
}

export function isLogoutPending() {
  return localStorage.getItem(LOGOUT_PENDING_KEY) === 'true';
}

export function markLogoutPending() {
  localStorage.setItem(LOGOUT_PENDING_KEY, 'true');
}

export function clearLogoutPending() {
  localStorage.removeItem(LOGOUT_PENDING_KEY);
}

export function readStoredDeviceToken() {
  const storedToken = localStorage.getItem(DEVICE_STORAGE_KEYS.TOKEN);
  if (!storedToken) return null;

  try {
    return JSON.parse(storedToken);
  } catch {
    return storedToken;
  }
}

export function writeStoredDeviceRegistration(token, stall, device) {
  localStorage.setItem(DEVICE_STORAGE_KEYS.TOKEN, JSON.stringify(token));
  localStorage.setItem(DEVICE_STORAGE_KEYS.STALL, JSON.stringify(stall));
  localStorage.setItem(DEVICE_STORAGE_KEYS.DEVICE, JSON.stringify(device));
  localStorage.setItem(DEVICE_STORAGE_KEYS.REGISTERED, JSON.stringify(true));
}

export function clearStoredDeviceRegistration() {
  Object.values(DEVICE_STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
}
