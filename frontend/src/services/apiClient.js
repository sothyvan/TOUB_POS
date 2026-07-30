import axios from 'axios';
import {
  readStoredCsrfToken,
  readStoredDeviceToken,
  writeStoredCsrfToken,
} from '../features/auth/authStorage';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
const CSRF_COOKIE_NAME = 'toub_csrf_token';

let onUnauthorized = null;
let onAuthSessionChanged = null;
let accessToken = null;
let refreshPromise = null;
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});

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

export function setAuthSessionHandler(handler) {
  onAuthSessionChanged = handler;
}

export function setAccessToken(token) {
  accessToken = token || null;
}

export function getAccessToken() {
  return accessToken;
}

function readCookie(name) {
  const prefix = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

export function hasRefreshSessionHint() {
  return Boolean(readStoredCsrfToken() || readCookie(CSRF_COOKIE_NAME));
}

function authHeaders({ includeCsrf = false } = {}) {
  const deviceToken = readStoredDeviceToken();
  const csrfToken = includeCsrf
    ? (readStoredCsrfToken() || readCookie(CSRF_COOKIE_NAME))
    : null;
  return {
    ...(deviceToken ? { 'X-Device-Token': deviceToken } : {}),
    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
  };
}

function applyAuthSession(payload) {
  const authData = payload?.data || payload;
  if (!authData?.token || !authData?.user || !authData?.csrfToken) {
    throw new ApiError(
      'Authentication response did not include the required session data.',
      0,
      payload,
    );
  }
  writeStoredCsrfToken(authData.csrfToken);
  setAccessToken(authData.token);
  onAuthSessionChanged?.(authData);
  return authData;
}

export function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = apiClient.post('/auth/refresh', null, {
    headers: authHeaders({ includeCsrf: true }),
  })
    .then((response) => applyAuthSession(response.data))
    .catch((error) => {
      setAccessToken(null);
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export async function checkApiHealth(timeout = 3000) {
  try {
    const response = await apiClient.get('/health', {
      timeout,
      params: { check: Date.now() },
      headers: { 'Cache-Control': 'no-cache' },
    });
    return response.status === 200 && response.data?.success === true;
  } catch {
    return false;
  }
}

function normalizePath(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return normalizedPath;
}

export async function apiRequest(path, options = {}) {
  const {
    authToken,
    body,
    headers: customHeaders,
    method = 'GET',
    skipAuthRefresh = false,
    ...requestOptions
  } = options;
  const token = authToken ?? getAccessToken();
  const deviceToken = readStoredDeviceToken();
  const executeRequest = (requestToken) => apiClient.request({
    ...requestOptions,
    url: normalizePath(path),
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(requestToken ? { Authorization: `Bearer ${requestToken}` } : {}),
      ...(deviceToken ? { 'X-Device-Token': deviceToken } : {}),
      ...customHeaders,
    },
    data: body,
  });

  try {
    const response = await executeRequest(token);
    const responseAuthData = response.data?.data || response.data;
    if (responseAuthData?.csrfToken) {
      writeStoredCsrfToken(responseAuthData.csrfToken);
    }

    return response.data ?? null;
  } catch (error) {
    if (!axios.isAxiosError(error)) {
      throw error;
    }

    const status = error.response?.status || 0;
    const payload = error.response?.data || null;
    const nonRefreshableCodes = [
      'DEVICE_REQUIRED',
      'DEVICE_REVOKED',
      'DEVICE_SESSION_INVALID',
      'STALL_ASSIGNMENT_CHANGED',
      'SESSION_INVALIDATED',
    ];

    if (
      status === 401
      && token
      && !skipAuthRefresh
      && !nonRefreshableCodes.includes(payload?.code)
    ) {
      try {
        const refreshedSession = await refreshAccessToken();
        const retriedResponse = await executeRequest(refreshedSession.token);
        return retriedResponse.data ?? null;
      } catch {
        // The shared unauthorized path below clears local auth state.
      }
    }

    if (status === 401 && onUnauthorized) {
      onUnauthorized({ status, payload });
    }

    const message = payload?.message || payload?.error || error.message || `Request failed with status ${status}.`;
    throw new ApiError(message, status, payload);
  }
}

export const authApi = {
  login(username, password) {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: { username, password },
      skipAuthRefresh: true,
    });
  },
  loginPin(userId, pin) {
    return apiRequest('/auth/pin', {
      method: 'POST',
      body: { userId, pin },
      skipAuthRefresh: true,
    });
  },
  refresh() {
    return refreshAccessToken();
  },
  async logout() {
    const response = await apiClient.post('/auth/logout', null, {
      headers: authHeaders({ includeCsrf: true }),
    });
    return response.data;
  },
  getCashiers() {
    return apiRequest('/auth/cashiers');
  },
  getDeviceStatus() {
    return apiRequest('/auth/device-status');
  },
};
