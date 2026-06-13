import { useMemo, useState } from 'react';
import { mapUsersWithDefaultPins } from '../utils/permissions';
import { api } from '../services/api';

const blankUserForm = () => ({
  id: null, name: '', role: 'Cashier', station: 'Station 01', pin: '', active: true,
});

/**
 * Manages user accounts — persisted state and CRUD.
 * @param {boolean} canManageUsers
 * @param {string} currentUserId - prevents self-disable/delete
 */
export function useUsers(canManageUsers, currentUserId) {
  const [rawUsers, setUsers] = useState(() => api.users.getAll());
  const [userForm, setUserForm] = useState(blankUserForm);

  const users = useMemo(
    () => mapUsersWithDefaultPins(rawUsers),
    [rawUsers]
  );

  const saveUser = () => {
    const name = userForm.name.trim();
    if (!canManageUsers || !name || (!userForm.id && !userForm.pin.trim())) {
      alert('Add a name and PIN.');
      return;
    }
    const user = { ...userForm, name, pin: userForm.pin.trim() };
    api.users.save(user);
    setUsers(api.users.getAll());
    setUserForm(blankUserForm());
  };

  const editUser = (user) => setUserForm(user);

  const cancelUserEdit = () => {
    setUserForm(blankUserForm());
  };

  const toggleUserActive = (userId) => {
    if (!canManageUsers) return;
    if (userId === currentUserId) {
      alert('You cannot disable the account currently logged in.');
      return;
    }
    const target = rawUsers.find((u) => u.id === userId);
    if (target) {
      api.users.save({ ...target, active: !target.active });
      setUsers(api.users.getAll());
    }
  };

  const deleteUser = (userId) => {
    if (!canManageUsers) return;
    const target = users.find((u) => u.id === userId);
    const activeCount = users.filter((u) => u.active).length;
    if (userId === currentUserId || (target?.active && activeCount <= 1)) {
      alert('Keep at least one active user, and do not delete the account currently logged in.');
      return;
    }
    api.users.delete(userId);
    setUsers(api.users.getAll());
  };

  return { users, userForm, setUserForm, saveUser, editUser, cancelUserEdit, toggleUserActive, deleteUser };
}
