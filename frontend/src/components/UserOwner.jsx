import { useState } from 'react';
import TabPills from './ui/TabPills';
import StaffList from './staff/StaffList';
import StaffAllocation from './staff/StaffAllocation';

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
        />
      ) : (
        <StaffAllocation users={users} />
      )}
    </div>
  );
}
