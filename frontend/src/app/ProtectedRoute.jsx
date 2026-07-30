import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';
import { roleToApiRole } from '../utils/permissions';
import LoadingState from '../components/ui/LoadingState';

function homeForRole(role) {
  const normalizedRole = roleToApiRole(role);
  if (['owner', 'manager'].includes(normalizedRole)) return '/owner-portal';
  if (normalizedRole === 'cashier') return '/cashier';
  return '/login';
}

export default function ProtectedRoute({ allowedRoles, children }) {
  const location = useLocation();
  const { user, isAuthenticated, isRestoring } = useAuth();

  if (isRestoring) {
    return <LoadingState label="Restoring secure session..." className="min-h-svh bg-brand-bg" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const currentRole = roleToApiRole(user.role);
  if (!allowedRoles.includes(currentRole)) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  return children;
}
