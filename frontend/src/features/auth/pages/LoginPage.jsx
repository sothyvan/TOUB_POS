import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSavedState } from '../../../hooks/useSavedState';
import { useAutoRefresh } from '../../../hooks/useAutoRefresh';
import { getPermissions } from '../../../utils/permissions';
import { apiRequest, authApi } from '../../../services/apiClient';
import { useAuth } from '../useAuth';
import LoginScreen from '../components/LoginScreen';
import {
  clearStoredDeviceRegistration,
  DEVICE_STORAGE_KEYS,
  writeStoredDeviceRegistration,
} from '../authStorage';

export default function LoginPage() {
  const navigate = useNavigate();
  const {
    user: currentUser,
    login,
    loginPin,
    logout,
    isAuthenticated,
    authNotice,
    clearAuthNotice,
  } = useAuth();

  const [deviceToken, setDeviceToken] = useSavedState(DEVICE_STORAGE_KEYS.TOKEN, null);
  const [deviceRegistered, setDeviceRegistered] = useSavedState(DEVICE_STORAGE_KEYS.REGISTERED, false);
  const [searchParams, setSearchParams] = useSearchParams();
  const modeParam = searchParams.get('mode'); // 'cashier' | 'management' | null
  const loginMode =
    modeParam === 'management' ? 'management'
    : modeParam === 'cashier' ? 'cashier'
    : (deviceRegistered && deviceToken ? 'cashier' : 'management');
  const [flowStep, setFlowStep] = useState(
    loginMode === 'cashier' && deviceRegistered && deviceToken ? 'select-profile' : 'register'
  );

  const setLoginMode = useCallback((mode) => {
    if (mode === 'management') setSearchParams({ mode: 'management' }, { replace: true });
    else setSearchParams({ mode: 'cashier' }, { replace: true });
  }, [setSearchParams]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [typedPin, setTypedPin] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [activeCashiers, setActiveCashiers] = useState([]);
  const [ownerToken, setOwnerToken] = useState(null);
  const [availableStalls, setAvailableStalls] = useState([]);
  const showDemoCredentials = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_CREDENTIALS === 'true';

  const loadActiveCashiers = useCallback(async ({ resetDeviceOnFailure = false } = {}) => {
    if (!deviceRegistered || !deviceToken) {
      return [];
    }

    try {
      const res = await authApi.getCashiers();
      const cashiersList = res?.data || [];
      const mappedCashiers = cashiersList.map(u => ({
        ...u,
        name: u.username,
        active: true
      }));
      setActiveCashiers(mappedCashiers);
      return mappedCashiers;
    } catch (err) {
      console.error('Failed to load cashier roster:', err);
      if (resetDeviceOnFailure) {
        clearStoredDeviceRegistration();
        setDeviceRegistered(false);
        setDeviceToken(null);
        setFlowStep('register');
        setLoginMode('management');
        setLoginError(err.message || 'This terminal must be registered again.');
      }
      return [];
    }
  }, [deviceRegistered, deviceToken, setDeviceRegistered, setDeviceToken, setLoginMode]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadActiveCashiers({ resetDeviceOnFailure: true });
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadActiveCashiers]);

  useAutoRefresh(() => loadActiveCashiers({ resetDeviceOnFailure: false }), {
    enabled: Boolean(deviceRegistered && deviceToken),
    intervalMs: 30000,
  });

  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;

    if (getPermissions(currentUser).isManagement) {
      navigate('/owner-portal', { replace: true });
    } else if (getPermissions(currentUser).isCashier) {
      navigate('/cashier', { replace: true });
    }
  }, [currentUser, isAuthenticated, navigate]);

  // Handle standard management login or temporary device registration gate.
  const handleManagementLogin = async (username, password, isRegistering = false) => {
    clearAuthNotice();
    setLoginError('');

    try {
      if (isRegistering) {
        const response = await authApi.login(username.trim(), password.trim());
        const authData = response?.data || response;

        const role = String(authData?.user?.role || '').toLowerCase();
        if (role !== 'owner' && role !== 'manager') {
          setLoginError('Only owner or manager accounts can register a terminal.');
          return false;
        }

        const stallsData = await apiRequest('/stalls', {
          authToken: authData.token,
        });

        setOwnerToken(authData.token);
        setAvailableStalls(stallsData.data || []);
      } else {
        const authenticatedUser = await login(username.trim(), password.trim());
        const permissions = getPermissions(authenticatedUser);

        if (!permissions.isManagement) {
          logout();
          setLoginError('Only owner or manager accounts can access the management portal.');
          return false;
        }
        navigate('/owner-portal', { replace: true });
      }
      return true;
    } catch (error) {
      setLoginError(error.message || 'Unable to log in. Please check your credentials.');
      return false;
    }
  };

  const handleRegisterDevice = async (stallId, deviceName) => {
    setLoginError('');
    try {
      const payload = await apiRequest(`/stalls/${stallId}/register-device`, {
        method: 'POST',
        authToken: ownerToken,
        body: { device_name: deviceName },
      });
      const { device_token, device, stall } = payload.data;

      writeStoredDeviceRegistration(device_token, stall, device);

      setDeviceToken(device_token);
      setDeviceRegistered(true);

      setOwnerToken(null);
      setAvailableStalls([]);

      setLoginMode('cashier');
      setFlowStep('select-profile');
    } catch (error) {
      setLoginError(error.message || 'Failed to register device.');
    }
  };

  const handleCancelRegistration = () => {
    setOwnerToken(null);
    setAvailableStalls([]);
    setLoginError('');
  };

  // Cashier profile tap in Step 2
  const handleSelectProfile = (user) => {
    clearAuthNotice();
    setSelectedUser(user);
    setTypedPin('');
    setLoginError('');
    setFlowStep('pin-pad');
  };

  // Cashier PIN pad input key handler
  const handlePinKeyPress = async (num) => {
    if (typedPin.length >= 4) return;
    setLoginError('');
    const newPin = typedPin + num;
    setTypedPin(newPin);

    if (newPin.length === 4) {
      if (!selectedUser) return;
      try {
        await loginPin(selectedUser.id, newPin);
        // On success, the useEffect at the top will automatically redirect 
        // the user to /cashier because isAuthenticated becomes true.
      } catch (err) {
        setLoginError(err.message || 'Invalid PIN.');
        setTypedPin('');
      }
    }
  };

  // Cashier PIN pad backspace
  const handlePinErase = () => {
    setTypedPin((prev) => prev.slice(0, -1));
  };

  // Keep a ref that always points to the latest callbacks.
  // The keydown listener below is registered once (when flowStep becomes 'pin-pad'),
  // so without a ref it would capture a stale closure where typedPin is always ''
  // — causing only the first digit to ever register.
  const pinHandlersRef = useRef({ onKeyPress: handlePinKeyPress, onErase: handlePinErase });
  useEffect(() => {
    pinHandlersRef.current = { onKeyPress: handlePinKeyPress, onErase: handlePinErase };
  });

  // Allow physical keyboard input when the PIN pad is visible.
  useEffect(() => {
    if (flowStep !== 'pin-pad') return;

    const handleKeyDown = (e) => {
      if (e.key === 'Backspace') {
        pinHandlersRef.current.onErase();
      } else if (/^[0-9]$/.test(e.key)) {
        pinHandlersRef.current.onKeyPress(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flowStep]);

  return (
    <>
      <LoginScreen
      loginMode={loginMode}
      setLoginMode={setLoginMode}
      flowStep={flowStep}
      setFlowStep={setFlowStep}
      activeCashiers={activeCashiers}
      selectedUser={selectedUser}
      setSelectedUser={setSelectedUser}
      typedPin={typedPin}
      onKeyPress={handlePinKeyPress}
      onErase={handlePinErase}
      loginError={loginError || authNotice}
      setLoginError={setLoginError}
      onManagementLogin={handleManagementLogin}
      onSelectProfile={handleSelectProfile}
      showDemoCredentials={showDemoCredentials}
      ownerToken={ownerToken}
      availableStalls={availableStalls}
      onRegisterDevice={handleRegisterDevice}
      onCancelRegistration={handleCancelRegistration}
      />
    </>
  );
}
