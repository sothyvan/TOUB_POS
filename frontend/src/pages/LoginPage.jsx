import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSavedState } from '../hooks/useSavedState';
import { getPermissions } from '../utils/permissions';
import { authApi } from '../services/apiClient';
import { useAuth } from '../auth/useAuth';
import LoginScreen from '../components/LoginScreen';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user: currentUser, login, loginPin, logout, isAuthenticated } = useAuth();

  const [deviceRegistered, setDeviceRegistered] = useSavedState('toub-device-registered', false);
  const [loginMode, setLoginMode] = useState(deviceRegistered ? 'cashier' : 'management');
  const [flowStep, setFlowStep] = useState(deviceRegistered ? 'select-profile' : 'register');
  const [selectedUser, setSelectedUser] = useState(null);
  const [typedPin, setTypedPin] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [activeCashiers, setActiveCashiers] = useState([]);
  const showDemoCredentials = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_CREDENTIALS === 'true';

  useEffect(() => {
    let mounted = true;
    authApi.getCashiers()
      .then(res => {
        if (mounted) {
          const cashiersList = res?.data || res || [];
          setActiveCashiers(cashiersList.map(u => ({
            ...u,
            name: u.username,
            station: 'Station 01', // Fallback for UI
            active: true
          })));
        }
      })
      .catch(console.error)
    return () => { mounted = false; };
  }, []);

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
    setLoginError('');

    try {
      const authenticatedUser = await login(username.trim(), password.trim(), {
        persist: !isRegistering,
      });
      const permissions = getPermissions(authenticatedUser);

      if (!permissions.isManagement) {
        logout();
        setLoginError('Only owner or manager accounts can access the management portal.');
        return false;
      }

      if (isRegistering) {
        setDeviceRegistered(true);
        setLoginMode('cashier');
        setFlowStep('select-profile');
      } else {
        navigate('/owner-portal', { replace: true });
      }
      return true;
    } catch (error) {
      setLoginError(error.message || 'Unable to log in. Please check your credentials.');
      return false;
    }
  };

  // Cashier profile tap in Step 2
  const handleSelectProfile = (user) => {
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
    <LoginScreen
      loginMode={loginMode}
      setLoginMode={setLoginMode}
      flowStep={flowStep}
      setFlowStep={setFlowStep}
      deviceRegistered={deviceRegistered}
      setDeviceRegistered={setDeviceRegistered}
      activeCashiers={activeCashiers}
      selectedUser={selectedUser}
      setSelectedUser={setSelectedUser}
      typedPin={typedPin}
      onKeyPress={handlePinKeyPress}
      onErase={handlePinErase}
      loginError={loginError}
      setLoginError={setLoginError}
      onManagementLogin={handleManagementLogin}
      onSelectProfile={handleSelectProfile}
      showDemoCredentials={showDemoCredentials}
    />
  );
}
