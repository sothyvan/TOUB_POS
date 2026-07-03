import { useCallback, useEffect, useMemo, useState } from 'react';
import { authApi, setUnauthorizedHandler } from '../services/apiClient';
import { clearStoredSession, readStoredSession, writeStoredSession } from './authStorage';
import { AuthContext } from './authContext';
import { toDisplayRole } from '../utils/permissions';

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

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  const login = useCallback(async (username, password, options = {}) => {
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
  }), [session.token, session.user, login, loginPin, clearSession]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
