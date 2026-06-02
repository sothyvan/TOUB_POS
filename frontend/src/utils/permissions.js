export function defaultPinForRole(role) {
  if (role === 'Admin') return '1234';
  if (role === 'Manager') return '2222';
  return '1111';
}

export function getPermissions(user) {
  const isAdmin = user?.role === 'Admin';
  const isManager = user?.role === 'Manager';
  const isCashier = user?.role === 'Cashier';

  return {
    isAdmin,
    isManager,
    isCashier,
    canManageMenu: isAdmin || isManager,
    canManageUsers: isAdmin,
    canViewOrders: isAdmin || isManager,
  };
}
