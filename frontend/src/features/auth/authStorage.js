export const AUTH_STORAGE_KEYS = {
  TOKEN: 'toub-auth-token',
  USER: 'toub-current-user',
};

export const DEVICE_STORAGE_KEYS = {
  TOKEN: 'toub-device-token',
  STALL: 'toub-device-stall',
  DEVICE: 'toub-device-info',
  REGISTERED: 'toub-device-registered',
};

export function readStoredSession() {
  const token = localStorage.getItem(AUTH_STORAGE_KEYS.TOKEN);
  const rawUser = localStorage.getItem(AUTH_STORAGE_KEYS.USER);

  if (!token || !rawUser) {
    return { token: null, user: null };
  }

  try {
    return { token, user: JSON.parse(rawUser) };
  } catch {
    clearStoredSession();
    return { token: null, user: null };
  }
}

export function writeStoredSession(token, user) {
  localStorage.setItem(AUTH_STORAGE_KEYS.TOKEN, token);
  localStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(user));
}

export function clearStoredSession() {
  localStorage.removeItem(AUTH_STORAGE_KEYS.TOKEN);
  localStorage.removeItem(AUTH_STORAGE_KEYS.USER);
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
