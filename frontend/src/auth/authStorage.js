export const AUTH_STORAGE_KEYS = {
  TOKEN: 'toub-auth-token',
  USER: 'toub-current-user',
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
