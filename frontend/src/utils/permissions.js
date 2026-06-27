export function defaultPinForRole(role) {
  if (roleToApiRole(role) === 'admin') return '1234';
  return '1111';
}

export function roleToApiRole(role) {
  return String(role || '').trim().toLowerCase();
}

export function toDisplayRole(role) {
  const normalizedRole = roleToApiRole(role);
  if (normalizedRole === 'admin') return 'Admin';
  if (normalizedRole === 'cashier') return 'Cashier';
  return role || '';
}

export function getPermissions(user) {
  const role = roleToApiRole(user?.role);
  const isAdmin = role === 'admin';
  const isCashier = role === 'cashier';

  return {
    isAdmin,
    isCashier,
    canManageMenu: isAdmin,
    canManageUsers: isAdmin,
    canViewOrders: isAdmin,
  };
}

export function mapUsersWithDefaultPins(users) {
  return users.map((u) => ({
    ...u,
    pin: u.pin || defaultPinForRole(u.role),
  }));
}
