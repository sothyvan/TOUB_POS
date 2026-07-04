import { AUTH_STORAGE_KEYS } from '../auth/authStorage';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

let onUnauthorized = null;

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

function apiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem(AUTH_STORAGE_KEYS.TOKEN);
  let deviceToken = localStorage.getItem('toub-device-token');
  if (deviceToken) {
    try {
      deviceToken = JSON.parse(deviceToken);
    } catch {
      // Fallback if the token was stored as a raw plain string
    }
  }
  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(deviceToken ? { 'X-Device-Token': deviceToken } : {}),
    ...options.headers,
  };

  const response = await fetch(apiUrl(path), {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    if (response.status === 401 && onUnauthorized) {
      onUnauthorized();
    }

    const message = payload?.message || payload?.error || `Request failed with status ${response.status}.`;
    throw new ApiError(message, response.status, payload);
  }

  return payload;
}

export const authApi = {
  login(username, password) {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: { username, password },
    });
  },
  loginPin(userId, pin) {
    return apiRequest('/auth/pin', {
      method: 'POST',
      body: { userId, pin },
    });
  },
  getCashiers() {
    return apiRequest('/auth/cashiers');
  },
};
