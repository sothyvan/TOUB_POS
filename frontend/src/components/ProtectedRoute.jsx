import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { roleToApiRole } from '../utils/permissions';

function homeForRole(role) {
  return roleToApiRole(role) === 'admin' ? '/admin-portal' : '/cashier';
}

export default function ProtectedRoute({ allowedRoles, children }) {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const currentRole = roleToApiRole(user.role);
  if (!allowedRoles.includes(currentRole)) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  return children;
}
