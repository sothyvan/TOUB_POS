import { useEffect, useState, useCallback } from 'react';
import TabPills from './ui/TabPills';
import StaffList from './staff/StaffList';
import StaffAllocation from './staff/StaffAllocation';
import { api } from '../services/api';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

const TABS = [
  { id: 'list',       label: 'Staff List'       },
  { id: 'allocation', label: 'Staff Allocation'  },
];

export default function UserOwner({
  userForm, setUserForm, users,
  onSave, onEdit, onToggleActive, onDelete, onCancel,
  currentUser,
  loading,
  error,
}) {
  const [tab, setTab] = useState('list');
  const [stalls, setStalls] = useState([]);
  const [stallsLoading, setStallsLoading] = useState(true);
  const [stallsError, setStallsError] = useState('');

  const loadStalls = useCallback(async (showSpinner = false) => {
    try {
      if (showSpinner) setStallsLoading(true);
      const data = await api.stalls.getAll();
      setStalls(data);
      setStallsError('');
      return data;
    } catch (err) {
      setStallsError(err.message || 'Failed to load stall assignments.');
      return [];
    } finally {
      if (showSpinner) setStallsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadStalls(true);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadStalls]);

  useAutoRefresh(() => loadStalls(false), {
    intervalMs: 30000,
  });

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      {/* Tab pills */}
      <TabPills tabs={TABS} activeId={tab} onChange={setTab} className="w-fit" />

      {/* Content */}
      {tab === 'list' ? (
        <StaffList
          userForm={userForm}
          setUserForm={setUserForm}
          users={users}
          onSave={onSave}
          onEdit={onEdit}
          onToggleActive={onToggleActive}
          onDelete={onDelete}
          onCancel={onCancel}
          currentUser={currentUser}
          loading={loading}
          error={error}
          stalls={stalls}
          stallsLoading={stallsLoading}
          stallsError={stallsError}
        />
      ) : (
        <StaffAllocation users={users} stalls={stalls} />
      )}
    </div>
  );
}
