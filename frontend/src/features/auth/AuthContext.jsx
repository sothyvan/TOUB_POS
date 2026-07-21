import { useCallback, useEffect, useMemo, useState } from 'react';
import { authApi, setUnauthorizedHandler } from '../../services/apiClient';
import {
  clearStoredDeviceRegistration,
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
} from './authStorage';
import { AuthContext } from './authContext';
import { toDisplayRole } from '../../utils/permissions';

function normalizeAuthUser(user) {
  const role = toDisplayRole(user?.role);

  return {
    ...user,
    role,
    apiRole: String(user?.role || '').toLowerCase(),
    name: user?.name || user?.username || 'User',
    active: user?.active ?? true,
  };
}

export function AuthProvider({ children }) {
  const [authNotice, setAuthNotice] = useState('');
  const [session, setSession] = useState(() => {
    const stored = readStoredSession();
    return {
      token: stored.token,
      user: stored.user ? normalizeAuthUser(stored.user) : null,
    };
  });

  const clearSession = useCallback(() => {
    clearStoredSession();
    setSession({ token: null, user: null });
  }, []);

  const handleDeviceRevoked = useCallback((message = 'This terminal was deregistered by management.') => {
    clearStoredDeviceRegistration();
    clearStoredSession();
    setSession({ token: null, user: null });
    setAuthNotice(message);
  }, []);

  const clearAuthNotice = useCallback(() => {
    setAuthNotice('');
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(({ payload } = {}) => {
      const deviceCodes = ['DEVICE_REQUIRED', 'DEVICE_REVOKED', 'DEVICE_SESSION_INVALID'];
      if (deviceCodes.includes(payload?.code)) {
        handleDeviceRevoked(payload?.message);
        return;
      }
      clearSession();
    });
    return () => setUnauthorizedHandler(null);
  }, [clearSession, handleDeviceRevoked]);

  const login = useCallback(async (username, password, options = {}) => {
    setAuthNotice('');
    const response = await authApi.login(username, password);
    const authData = response?.data || response;

    if (!authData?.token || !authData?.user) {
      throw new Error('Login response did not include a token and user.');
    }

    const user = normalizeAuthUser(authData.user);
    if (options.persist !== false) {
      writeStoredSession(authData.token, user);
      setSession({ token: authData.token, user });
    }
    return user;
  }, []);

  const loginPin = useCallback(async (userId, pin, options = {}) => {
    setAuthNotice('');
    const response = await authApi.loginPin(userId, pin);
    const authData = response?.data || response;

    if (!authData?.token || !authData?.user) {
      throw new Error('Login response did not include a token and user.');
    }

    const user = normalizeAuthUser(authData.user);
    if (options.persist !== false) {
      writeStoredSession(authData.token, user);
      setSession({ token: authData.token, user });
    }
    return user;
  }, []);

  const value = useMemo(() => ({
    token: session.token,
    user: session.user,
    isAuthenticated: Boolean(session.token && session.user),
    login,
    loginPin,
    logout: clearSession,
    clearSession,
    authNotice,
    clearAuthNotice,
    handleDeviceRevoked,
  }), [session.token, session.user, login, loginPin, clearSession, authNotice, clearAuthNotice, handleDeviceRevoked]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
