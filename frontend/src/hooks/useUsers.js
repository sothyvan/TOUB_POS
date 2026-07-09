import { useMemo, useState, useEffect, useCallback } from 'react';
import { canManageUserRole, roleToApiRole } from '../utils/permissions';
import { api } from '../services/api';
import { useAutoRefresh } from './useAutoRefresh';

const blankUserForm = () => ({
  id: null, name: '', role: 'cashier', password: '', pin: '', active: true,
});

/**
 * Manages user accounts — fetched from backend.
 * @param {boolean} canManageUsers
 * @param {object} currentUser - prevents self-disable/delete and scopes role management
 */
export function useUsers(canManageUsers, currentUser) {
  const [rawUsers, setUsers] = useState([]);
  const [userForm, setUserForm] = useState(blankUserForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const currentUserId = currentUser?.id;

  const fetchUsers = useCallback(async (showSpinner = false) => {
    if (!canManageUsers) {
      setUsers([]);
      setLoading(false);
      return [];
    }

    try {
      if (showSpinner) setLoading(true);
      const data = await api.users.getAll();
      setUsers(data);
      setError(null);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to load users.');
      return [];
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [canManageUsers]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void fetchUsers(true);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [fetchUsers]);

  useAutoRefresh(() => fetchUsers(false), {
    enabled: canManageUsers,
    intervalMs: 30000,
  });

  const users = useMemo(
    () => rawUsers
      .map((user) => ({ ...user, password: '', pin: '' }))
      .filter((user) => canManageUserRole(currentUser, user.role)),
    [currentUser, rawUsers]
  );

  const saveUser = async () => {
    const name = userForm.name.trim();
    const role = roleToApiRole(userForm.role);
    const isCashier = role === 'cashier';
    const password = String(userForm.password || '').trim();
    const pin = String(userForm.pin || '').trim();

    if (!canManageUsers || !name) {
      alert('Add a name.');
      return false;
    }
    if (!userForm.id && isCashier && !pin) {
      alert('Add a name and PIN for the cashier.');
      return false;
    }
    if (!userForm.id && !isCashier && !password) {
      alert('Add a name and password for the owner or manager.');
      return false;
    }
    if (!canManageUserRole(currentUser, userForm.role)) {
      alert('You do not have permission to manage this role.');
      return false;
    }
    try {
      const user = {
        ...userForm,
        name,
        password: isCashier ? '' : password,
        pin: isCashier ? pin : '',
      };
      await api.users.save(user);
      await fetchUsers(false);
      setUserForm(blankUserForm());
      return true;
    } catch (err) {
      alert(err.message || 'Failed to save user.');
      return false;
    }
  };

  const editUser = (user) => setUserForm({ ...user, password: '', pin: '' });
  const cancelUserEdit = () => setUserForm(blankUserForm());

  const toggleUserActive = async (userId) => {
    if (!canManageUsers) return;
    if (userId === currentUserId) {
      alert('You cannot disable the account currently logged in.');
      return;
    }
    const target = rawUsers.find((u) => u.id === userId);
    if (target && !canManageUserRole(currentUser, target.role)) {
      alert('You do not have permission to manage this role.');
      return;
    }
    if (target) {
      try {
        await api.users.save({ ...target, active: !target.active });
        await fetchUsers(false);
      } catch(err) {
        alert(err.message || 'Failed to toggle user status.');
      }
    }
  };

  const deleteUser = async (userId) => {
    if (!canManageUsers) return;
    const target = users.find((u) => u.id === userId);
    const activeCount = users.filter((u) => u.active).length;
    if (target && !canManageUserRole(currentUser, target.role)) {
      alert('You do not have permission to manage this role.');
      return;
    }
    if (userId === currentUserId || (target?.active && activeCount <= 1)) {
      alert('Keep at least one active user, and do not delete the account currently logged in.');
      return;
    }
    try {
      await api.users.delete(userId);
      await fetchUsers(false);
    } catch(err) {
      alert(err.message || 'Failed to delete user.');
    }
  };

  return { users, userForm, setUserForm, saveUser, editUser, cancelUserEdit, toggleUserActive, deleteUser, loading, error };
}
