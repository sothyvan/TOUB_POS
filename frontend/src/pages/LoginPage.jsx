import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSavedState } from '../hooks/useSavedState';
import { DEFAULT_USERS } from '../data/seedData';
import { defaultPinForRole } from '../utils/permissions';
import LoginScreen from '../components/LoginScreen';
import '../styles/CashierWorkspace.css';

export default function LoginPage() {
  const navigate = useNavigate();

  const [rawUsers] = useSavedState('sabay-pos-users', DEFAULT_USERS);
  const [loginUserId, setLoginUserId] = useState(() => rawUsers.find((u) => u.active)?.id || '');
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState('');

  const users = useMemo(
    () => rawUsers.map((u) => ({ ...u, pin: u.pin || defaultPinForRole(u.role) })),
    [rawUsers],
  );

  const activeUsers = users.filter((u) => u.active);

  const effectiveLoginUserId =
    users.some((u) => u.id === loginUserId && u.active) ? loginUserId : activeUsers[0]?.id || '';

  const handleLogin = (event) => {
    event.preventDefault();
    const user = users.find((u) => u.id === effectiveLoginUserId && u.active);

    if (!user || user.pin !== loginPin.trim()) {
      setLoginError('Invalid user or PIN.');
      return;
    }

    // Pass the authenticated user into the cashier route via router state.
    navigate('/cashier', { state: { currentUser: user }, replace: true });
  };

  return (
    <LoginScreen
      activeUsers={activeUsers}
      effectiveLoginUserId={effectiveLoginUserId}
      loginPin={loginPin}
      loginError={loginError}
      onLogin={handleLogin}
      onPinChange={setLoginPin}
      onUserChange={setLoginUserId}
    />
  );
}
