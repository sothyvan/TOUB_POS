import { useMemo, useState, useEffect } from 'react';
import { canManageUserRole, roleToApiRole } from '../utils/permissions';
import { api } from '../services/api';

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

  useEffect(() => {
    let ignore = false;
    async function init() {
      if (canManageUsers) {
        try {
          if (!ignore) setLoading(true);
          const data = await api.users.getAll();
          if (!ignore) setUsers(data);
        } catch (err) {
          if (!ignore) setError(err.message || 'Failed to load users.');
        } finally {
          if (!ignore) setLoading(false);
        }
      } else {
        if (!ignore) setLoading(false);
      }
    }
    init();
    return () => { ignore = true; };
  }, [canManageUsers]);

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
      setUsers(await api.users.getAll());
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
        setUsers(await api.users.getAll());
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
      setUsers(await api.users.getAll());
    } catch(err) {
      alert(err.message || 'Failed to delete user.');
    }
  };

  return { users, userForm, setUserForm, saveUser, editUser, cancelUserEdit, toggleUserActive, deleteUser, loading, error };
}
