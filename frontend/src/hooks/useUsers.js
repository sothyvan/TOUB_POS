import { useMemo, useState } from 'react';
import { DEFAULT_USERS } from '../data/seedData';
import { makeId } from '../utils/ids';
import { defaultPinForRole } from '../utils/permissions';
import { useSavedState } from './useSavedState';

const blankUserForm = () => ({
  id: null, name: '', role: 'Cashier', station: 'Station 01', pin: '', active: true,
});

/**
 * Manages user accounts — persisted state and CRUD.
 * @param {boolean} canManageUsers
 * @param {string} currentUserId - prevents self-disable/delete
 */
export function useUsers(canManageUsers, currentUserId) {
  const [rawUsers, setUsers] = useSavedState('sabay-pos-users', DEFAULT_USERS);
  const [userForm, setUserForm] = useState(blankUserForm);

  const users = useMemo(
    () => rawUsers.map((u) => ({ ...u, pin: u.pin || defaultPinForRole(u.role) })),
    [rawUsers]
  );

  const saveUser = () => {
    const name = userForm.name.trim();
    if (!canManageUsers || !name || !userForm.pin.trim()) {
      alert('Add a name and PIN.');
      return;
    }
    const user = { ...userForm, id: userForm.id || makeId('user'), name, pin: userForm.pin.trim() };
    if (userForm.id) {
      setUsers((cur) => cur.map((u) => (u.id === user.id ? user : u)));
    } else {
      setUsers((cur) => [...cur, user]);
    }
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
    setUsers((cur) => cur.map((u) => (u.id === userId ? { ...u, active: !u.active } : u)));
  };

  const deleteUser = (userId) => {
    if (!canManageUsers) return;
    const target = users.find((u) => u.id === userId);
    const activeCount = users.filter((u) => u.active).length;
    if (userId === currentUserId || (target?.active && activeCount <= 1)) {
      alert('Keep at least one active user, and do not delete the account currently logged in.');
      return;
    }
    setUsers((cur) => cur.filter((u) => u.id !== userId));
  };

  return { users, userForm, setUserForm, saveUser, editUser, cancelUserEdit, toggleUserActive, deleteUser };
}
