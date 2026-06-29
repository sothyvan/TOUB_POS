import { useEffect, useState } from 'react';
import TabPills from './ui/TabPills';
import StaffList from './staff/StaffList';
import StaffAllocation from './staff/StaffAllocation';
import { api } from '../services/api';

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

  useEffect(() => {
    let ignore = false;
    async function loadStalls() {
      try {
        setStallsLoading(true);
        const data = await api.stalls.getAll();
        if (!ignore) setStalls(data);
      } catch (err) {
        if (!ignore) setStallsError(err.message || 'Failed to load stall assignments.');
      } finally {
        if (!ignore) setStallsLoading(false);
      }
    }
    loadStalls();
    return () => { ignore = true; };
  }, []);

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
