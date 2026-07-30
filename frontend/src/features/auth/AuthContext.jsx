import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  authApi,
  hasRefreshSessionHint,
  setAccessToken,
  setAuthSessionHandler,
  setUnauthorizedHandler,
} from '../../services/apiClient';
import {
  clearLogoutPending,
  clearStoredCsrfToken,
  clearStoredDeviceRegistration,
  clearStoredSession,
  isLogoutPending,
  markLogoutPending,
} from './authStorage';
import { AuthContext } from './authContext';
import { toDisplayRole } from '../../utils/permissions';
import { updateSocketAccessToken } from '../../services/socketClient';

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
  const [isRestoring, setIsRestoring] = useState(
    () => isLogoutPending() || hasRefreshSessionHint(),
  );
  const [session, setSession] = useState({ token: null, user: null });

  const clearSession = useCallback(({ preserveCsrf = false } = {}) => {
    clearStoredSession({ preserveCsrf });
    setAccessToken(null);
    updateSocketAccessToken(null);
    setSession({ token: null, user: null });
  }, []);

  const applySession = useCallback((authData) => {
    const user = normalizeAuthUser(authData.user);
    clearLogoutPending();
    setAccessToken(authData.token);
    updateSocketAccessToken(authData.token);
    setSession({ token: authData.token, user });
    return user;
  }, []);

  const handleDeviceRevoked = useCallback((message = 'This terminal was deregistered by management.') => {
    clearStoredDeviceRegistration();
    clearSession();
    setAuthNotice(message);
  }, [clearSession]);

  const handleSessionInvalidated = useCallback((message = 'Your session is no longer valid. Please sign in again.') => {
    clearSession();
    setAuthNotice(message);
  }, [clearSession]);

  const clearAuthNotice = useCallback(() => {
    setAuthNotice('');
  }, []);

  useEffect(() => {
    clearStoredSession({ preserveCsrf: true });
    setAuthSessionHandler((authData) => {
      applySession(authData);
    });

    let active = true;
    if (isLogoutPending()) {
      authApi.logout()
        .then(() => {
          clearLogoutPending();
          clearStoredCsrfToken();
        })
        .catch(() => {})
        .finally(() => {
          if (active) {
            setIsRestoring(false);
          }
        });
      return () => {
        active = false;
        setAuthSessionHandler(null);
      };
    }

    if (!hasRefreshSessionHint()) {
      return () => {
        active = false;
        setAuthSessionHandler(null);
      };
    }

    authApi.refresh()
      .catch(() => {
        if (active) {
          clearSession();
        }
      })
      .finally(() => {
        if (active) {
          setIsRestoring(false);
        }
      });

    return () => {
      active = false;
      setAuthSessionHandler(null);
    };
  }, [applySession, clearSession]);

  useEffect(() => {
    setUnauthorizedHandler(({ payload } = {}) => {
      const deviceCodes = ['DEVICE_REQUIRED', 'DEVICE_REVOKED', 'DEVICE_SESSION_INVALID'];
      if (deviceCodes.includes(payload?.code)) {
        handleDeviceRevoked(payload?.message);
        return;
      }
      if (['STALL_ASSIGNMENT_CHANGED', 'SESSION_INVALIDATED'].includes(payload?.code)) {
        handleSessionInvalidated(payload?.message);
        return;
      }
      clearSession();
    });
    return () => setUnauthorizedHandler(null);
  }, [clearSession, handleDeviceRevoked, handleSessionInvalidated]);

  const login = useCallback(async (username, password, options = {}) => {
    setAuthNotice('');
    const response = await authApi.login(username, password);
    const authData = response?.data || response;

    if (!authData?.token || !authData?.user || !authData?.csrfToken) {
      throw new Error('Login response did not include the required session data.');
    }

    const user = normalizeAuthUser(authData.user);
    if (options.persist !== false) {
      applySession(authData);
    }
    return user;
  }, [applySession]);

  const loginPin = useCallback(async (userId, pin, options = {}) => {
    setAuthNotice('');
    const response = await authApi.loginPin(userId, pin);
    const authData = response?.data || response;

    if (!authData?.token || !authData?.user || !authData?.csrfToken) {
      throw new Error('Login response did not include the required session data.');
    }

    const user = normalizeAuthUser(authData.user);
    if (options.persist !== false) {
      applySession(authData);
    }
    return user;
  }, [applySession]);

  const logout = useCallback(async () => {
    markLogoutPending();
    const revocation = authApi.logout();
    clearSession({ preserveCsrf: true });
    try {
      await revocation;
      clearLogoutPending();
      clearStoredCsrfToken();
    } catch {
      // The pending marker prevents cookie-based restoration until revocation succeeds.
    }
  }, [clearSession]);

  const value = useMemo(() => ({
    token: session.token,
    user: session.user,
    isAuthenticated: Boolean(session.token && session.user),
    isRestoring,
    login,
    loginPin,
    logout,
    clearSession,
    authNotice,
    clearAuthNotice,
    handleDeviceRevoked,
    handleSessionInvalidated,
  }), [session.token, session.user, isRestoring, login, loginPin, logout, clearSession, authNotice, clearAuthNotice, handleDeviceRevoked, handleSessionInvalidated]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
