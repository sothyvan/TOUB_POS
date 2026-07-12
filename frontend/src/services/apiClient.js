import axios from 'axios';
import { AUTH_STORAGE_KEYS } from '../features/auth/authStorage';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

let onUnauthorized = null;
const apiClient = axios.create({
  baseURL: API_BASE_URL,
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

function normalizePath(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return normalizedPath;
}

function readDeviceToken() {
  let deviceToken = localStorage.getItem('toub-device-token');
  if (!deviceToken) {
    return null;
  }
  try {
    return JSON.parse(deviceToken);
  } catch {
    return deviceToken;
  }
}

export async function apiRequest(path, options = {}) {
  const {
    authToken,
    body,
    headers: customHeaders,
    method = 'GET',
    ...requestOptions
  } = options;
  const token = authToken ?? localStorage.getItem(AUTH_STORAGE_KEYS.TOKEN);
  const deviceToken = readDeviceToken();
  const headers = {
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(deviceToken ? { 'X-Device-Token': deviceToken } : {}),
    ...customHeaders,
  };

  try {
    const response = await apiClient.request({
      ...requestOptions,
      url: normalizePath(path),
      method,
      headers,
      data: body,
    });

    return response.data ?? null;
  } catch (error) {
    if (!axios.isAxiosError(error)) {
      throw error;
    }

    const status = error.response?.status || 0;
    const payload = error.response?.data || null;
    if (status === 401 && onUnauthorized) {
      onUnauthorized();
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
