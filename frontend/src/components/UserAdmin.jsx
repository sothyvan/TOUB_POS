import { useState } from 'react';
import { ROLES } from '../data/seedData';
import AdminCRUDTable from './common/AdminCrudTable';

export default function UserAdmin({
  userForm,
  setUserForm,
  users,
  onSave,
  onEdit,
  onToggleActive,
  onDelete,
  onCancel,
}) {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const isFormOpen = Boolean(userForm.id) || isAddingNew;

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave();
    setIsAddingNew(false);
  };

  const handleCancel = () => {
    onCancel();
    setIsAddingNew(false);
  };

  const handleAddNewClick = () => {
    onCancel();
    setIsAddingNew(true);
  };

  const renderUser = (user) => {
    const roleBadgeClass =
      user.role === 'Admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
      user.role === 'Manager' ? 'bg-blue-50 text-blue-700 border-blue-200' :
      'bg-amber-50 text-amber-700 border-amber-200';

    return (
      <div className="flex flex-col gap-1 min-w-0">
        <strong className="block text-brand-text text-[15px] font-bold">{user.name}</strong>
        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${roleBadgeClass}`}>
            {user.role}
          </span>
          <span className="text-gray-400 text-xs font-bold">
            {user.station}
          </span>
          {user.active ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-[#e6f4eb] text-[#126149] border border-[#b9dec9]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#19a86f]" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-gray-100 text-gray-500 border border-gray-200">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              Disabled
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderForm = () => (
    <form className="grid gap-4.5" onSubmit={handleSubmit}>
      <label className="grid gap-1.5 text-brand-text text-[13px] font-bold">
        Name
        <input
          value={userForm.name}
          onChange={(event) => setUserForm((current) => ({ ...current, name: event.target.value }))}
          placeholder="Sokha"
          required
          className="w-full min-h-11.5 px-3.5 border border-brand-border rounded-xl bg-white text-brand-text text-[14px] font-semibold focus:border-brand-action focus:ring-1 focus:ring-brand-action outline-none transition-all placeholder:text-gray-300"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1.5 text-brand-text text-[13px] font-bold">
          Role
          <select
            value={userForm.role}
            onChange={(event) => setUserForm((current) => ({ ...current, role: event.target.value }))}
            className="w-full min-h-11.5 px-3.5 border border-brand-border rounded-xl bg-white text-brand-text text-[14px] font-semibold focus:border-brand-action focus:ring-1 focus:ring-brand-action outline-none transition-all"
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-brand-text text-[13px] font-bold">
          PIN
          <input
            type="password"
            inputMode="numeric"
            value={userForm.pin}
            onChange={(event) => setUserForm((current) => ({ ...current, pin: event.target.value }))}
            placeholder="4 digits"
            required={!userForm.id}
            className="w-full min-h-11.5 px-3.5 border border-brand-border rounded-xl bg-white text-brand-text text-[14px] font-semibold focus:border-brand-action focus:ring-1 focus:ring-brand-action outline-none transition-all placeholder:text-gray-300"
          />
        </label>
      </div>

      <label className="grid gap-1.5 text-brand-text text-[13px] font-bold">
        Station
        <input
          value={userForm.station}
          onChange={(event) => setUserForm((current) => ({ ...current, station: event.target.value }))}
          placeholder="Station 02"
          required
          className="w-full min-h-11.5 px-3.5 border border-brand-border rounded-xl bg-white text-brand-text text-[14px] font-semibold focus:border-brand-action focus:ring-1 focus:ring-brand-action outline-none transition-all placeholder:text-gray-300"
        />
      </label>

      <label className="flex items-center gap-2.5 text-brand-text text-[13px] font-bold cursor-pointer mt-1 select-none">
        <input
          type="checkbox"
          checked={userForm.active}
          onChange={(event) => setUserForm((current) => ({ ...current, active: event.target.checked }))}
          className="w-4.5 h-4.5 accent-brand-action rounded"
        />
        Active account
      </label>

      <div className="flex items-center gap-2.5 mt-4">
        <button
          className="flex-1 min-h-12 rounded-xl font-bold bg-brand-action hover:bg-brand-action/90 active:scale-[0.98] transition-all text-white border-0 cursor-pointer shadow-sm"
          type="submit"
        >
          {userForm.id ? 'Save user' : 'Add user'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="flex-1 min-h-12 border border-brand-border rounded-xl bg-white text-brand-text font-bold hover:bg-gray-50 active:scale-[0.98] transition-all cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );

  return (
    <AdminCRUDTable
      title="Users"
      items={users}
      renderItem={renderUser}
      itemLabel="user"
      addButtonLabel="Add User"
      onAdd={handleAddNewClick}
      onEdit={onEdit}
      onToggle={onToggleActive}
      toggleLabel={(user) => (user.active ? 'Disable' : 'Enable')}
      onDelete={onDelete}
      isFormOpen={isFormOpen}
      modalTitle={userForm.id ? 'Edit user' : 'Create user'}
      modalMaxWidth="max-w-107.5"
      onFormClose={handleCancel}
      formContent={renderForm}
    />
  );
}
