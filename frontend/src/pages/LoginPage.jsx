import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSavedState } from '../hooks/useSavedState';
import { DEFAULT_USERS } from '../data/seedData';
import { getPermissions, mapUsersWithDefaultPins, roleToApiRole } from '../utils/permissions';
import { STORAGE_KEYS } from '../services/api';
import { useAuth } from '../auth/useAuth';
import LoginScreen from '../components/LoginScreen';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user: currentUser, login, logout, isAuthenticated } = useAuth();

  const [rawUsers] = useSavedState(STORAGE_KEYS.USERS, DEFAULT_USERS);
  const [deviceRegistered, setDeviceRegistered] = useSavedState('toub-device-registered', false);

  const [loginMode, setLoginMode] = useState(deviceRegistered ? 'cashier' : 'management');
  const [flowStep, setFlowStep] = useState(deviceRegistered ? 'select-profile' : 'register');
  const [selectedUser, setSelectedUser] = useState(null);
  const [typedPin, setTypedPin] = useState('');
  const [loginError, setLoginError] = useState('');

  const users = useMemo(
    () => mapUsersWithDefaultPins(rawUsers),
    [rawUsers]
  );

  const activeUsers = users.filter((u) => u.active);
  const activeCashiers = activeUsers.filter((u) => roleToApiRole(u.role) === 'cashier');
  const showDemoCredentials = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_CREDENTIALS === 'true';

  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;

    if (getPermissions(currentUser).isManagement) {
      navigate('/admin-portal', { replace: true });
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
        navigate('/admin-portal', { replace: true });
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
  const handlePinKeyPress = (num) => {
    if (typedPin.length >= 4) return;
    setLoginError('');
    const newPin = typedPin + num;
    setTypedPin(newPin);

    if (newPin.length === 4) {
      setLoginError('Cashier PIN login needs the backend PIN endpoint in Phase 2 follow-up.');
      setTypedPin('');
    }
  };

  // Cashier PIN pad backspace
  const handlePinErase = () => {
    setTypedPin((prev) => prev.slice(0, -1));
  };

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
