export function roleToApiRole(role) {
  return String(role || '').trim().toLowerCase();
}

export function toDisplayRole(role) {
  const normalizedRole = roleToApiRole(role);
  if (normalizedRole === 'platform_admin') return 'Platform Admin';
  if (normalizedRole === 'owner') return 'Owner';
  if (normalizedRole === 'manager') return 'Manager';
  if (normalizedRole === 'cashier') return 'Cashier';
  return role || '';
}

export function getManageableDisplayRoles(user) {
  const role = roleToApiRole(user?.role);
  if (role === 'platform_admin') return ['Owner'];
  if (role === 'owner') return ['Manager', 'Cashier'];
  if (role === 'manager') return ['Cashier'];
  return [];
}

export function canManageUserRole(actor, targetRole) {
  const allowedRoles = getManageableDisplayRoles(actor).map(roleToApiRole);
  return allowedRoles.includes(roleToApiRole(targetRole));
}

export function getPermissions(user) {
  const role = roleToApiRole(user?.role);
  const isPlatformAdmin = role === 'platform_admin';
  const isOwner = role === 'owner';
  const isManager = role === 'manager';
  const isCashier = role === 'cashier';
  const isManagement = isOwner || isManager;

  return {
    isPlatformAdmin,
    isOwner,
    isManager,
    isCashier,
    isManagement,
    canManageMenu: isManagement,
    canManageUsers: isManagement,
    canManageOwnerActions: isOwner,
    canViewOrders: isManagement,
    manageableUserRoles: getManageableDisplayRoles(user),
  };
}
