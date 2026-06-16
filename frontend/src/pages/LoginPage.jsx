import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSavedState } from '../hooks/useSavedState';
import { DEFAULT_USERS } from '../data/seedData';
import { mapUsersWithDefaultPins } from '../utils/permissions';
import { STORAGE_KEYS } from '../services/api';
import LoginScreen from '../components/LoginScreen';

export default function LoginPage() {
  const navigate = useNavigate();

  const [rawUsers] = useSavedState(STORAGE_KEYS.USERS, DEFAULT_USERS);
  const [deviceRegistered, setDeviceRegistered] = useSavedState('toub-device-registered', false);

  const [loginMode, setLoginMode] = useState(deviceRegistered ? 'cashier' : 'admin');
  const [flowStep, setFlowStep] = useState(deviceRegistered ? 'select-profile' : 'register');
  const [selectedUser, setSelectedUser] = useState(null);
  const [typedPin, setTypedPin] = useState('');
  const [loginError, setLoginError] = useState('');

  const users = useMemo(
    () => mapUsersWithDefaultPins(rawUsers),
    [rawUsers]
  );

  const activeUsers = users.filter((u) => u.active);
  const activeCashiers = activeUsers.filter((u) => u.role === 'Cashier');

  // Handle standard login or admin registration
  const handleAdminLogin = (username, password, isRegistering = false) => {
    setLoginError('');
    const user = activeUsers.find(
      (u) =>
        u.name.toLowerCase() === username.trim().toLowerCase() &&
        u.pin === password.trim() &&
        (u.role === 'Admin' || u.role === 'Manager')
    );

    if (!user) {
      setLoginError('Invalid Administrator credentials or PIN.');
      return false;
    }

    if (isRegistering) {
      setDeviceRegistered(true);
      setLoginMode('cashier');
      setFlowStep('select-profile');
    } else {
      // Pass the authenticated user to back-office
      navigate('/cashier', { state: { currentUser: user }, replace: true });
    }
    return true;
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
      if (selectedUser && selectedUser.pin === newPin) {
        // Log in cashier successfully
        navigate('/cashier', { state: { currentUser: selectedUser }, replace: true });
      } else {
        setLoginError('Incorrect PIN. Please try again.');
        setTypedPin(''); // Clear pin entry
      }
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
      onAdminLogin={handleAdminLogin}
      onSelectProfile={handleSelectProfile}
    />
  );
}
