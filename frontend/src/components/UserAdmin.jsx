import { useState, useEffect } from 'react';
import { ROLES } from '../data/seedData';

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
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    if (userForm.id) {
      setIsFormOpen(true);
    }
  }, [userForm.id]);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave();
    setIsFormOpen(false);
  };

  const handleCancel = () => {
    onCancel();
    setIsFormOpen(false);
  };

  const handleAddNewClick = () => {
    onCancel();
    setIsFormOpen(true);
  };

  return (
    <div className="w-full">
      {/* Users List Card */}
      <div className="border border-[#ded8ca] rounded-[24px] bg-[#fffdfa] shadow-[0_12px_36px_rgba(52,45,35,0.04)] p-6 grid gap-2">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-2">
          <h3 className="m-0 text-brand-dark text-lg font-black tracking-tight">Users</h3>
          <button
            type="button"
            onClick={handleAddNewClick}
            className="min-h-[38px] px-4 rounded-full bg-[#003ec7] text-white text-xs font-bold hover:bg-[#003ec7]/90 active:scale-95 transition-all cursor-pointer shadow-sm flex items-center gap-1"
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add User
          </button>
        </div>

        {users.map((user) => {
          const role = user.role;
          const roleBadgeClass =
            role === 'Admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
            role === 'Manager' ? 'bg-blue-50 text-blue-700 border-blue-200' :
            'bg-amber-50 text-amber-700 border-amber-200'; // Cashier

          return (
            <div 
              className="py-4.5 px-0 border-t border-gray-100 grid grid-cols-[minmax(0,1fr)_auto] gap-4 items-center first-of-type:border-t-0" 
              key={user.id}
            >
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
              
              <div className="flex items-center gap-2 max-[768px]:justify-start">
                <button
                  type="button"
                  onClick={() => onEdit(user)}
                  title="Edit user"
                  aria-label="Edit user"
                  className="w-9 h-9 border border-[#d9d0c1] rounded-full bg-white text-[#4f483f] flex items-center justify-center transition-all cursor-pointer active:scale-95 hover:bg-[#003ec7] hover:text-white hover:border-[#003ec7]"
                >
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleActive(user.id)}
                  title={user.active ? 'Disable user' : 'Enable user'}
                  aria-label={user.active ? 'Disable user' : 'Enable user'}
                  className="w-9 h-9 border border-[#d9d0c1] rounded-full bg-white text-[#4f483f] flex items-center justify-center transition-all cursor-pointer active:scale-95 hover:bg-gray-150 hover:text-brand-dark"
                >
                  {user.active ? (
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  ) : (
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(user.id)}
                  title="Delete user"
                  aria-label="Delete user"
                  className="w-9 h-9 border border-[#d9d0c1] rounded-full bg-white text-[#4f483f] flex items-center justify-center transition-all cursor-pointer active:scale-95 hover:bg-[#c70000] hover:text-white hover:border-[#c70000]"
                >
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Overlay Modal for Create/Edit User */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#23211f]/40 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={handleCancel} />
          
          <div className="relative w-full max-w-[430px] border border-[#ded8ca] rounded-[24px] bg-[#fffdfa] shadow-[0_20px_50px_rgba(52,45,35,0.15)] p-6 z-10">
            {/* Close Button */}
            <button
              type="button"
              onClick={handleCancel}
              className="absolute top-5 right-5 w-8.5 h-8.5 rounded-full border border-[#d9d0c1] bg-white text-[#4f483f] grid place-items-center hover:bg-gray-150 cursor-pointer transition-all active:scale-90"
              aria-label="Close user form"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <form className="grid gap-4.5" onSubmit={handleSubmit}>
              <h3 className="m-0 text-brand-dark text-lg font-black tracking-tight border-b border-gray-100 pb-3">
                {userForm.id ? 'Edit user' : 'Create user'}
              </h3>
              
              <label className="grid gap-1.5 text-brand-text text-[13px] font-bold">
                Name
                <input
                  value={userForm.name}
                  onChange={(event) => setUserForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Sokha"
                  required
                  className="w-full min-h-[46px] px-3.5 border border-[#ded8ca] rounded-xl bg-white text-brand-text text-[14px] font-semibold focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all placeholder:text-gray-300"
                />
              </label>
              
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-brand-text text-[13px] font-bold">
                  Role
                  <select
                    value={userForm.role}
                    onChange={(event) => setUserForm((current) => ({ ...current, role: event.target.value }))}
                    className="w-full min-h-[46px] px-3.5 border border-[#ded8ca] rounded-xl bg-white text-brand-text text-[14px] font-semibold focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all"
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
                    className="w-full min-h-[46px] px-3.5 border border-[#ded8ca] rounded-xl bg-white text-brand-text text-[14px] font-semibold focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all placeholder:text-gray-300"
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
                  className="w-full min-h-[46px] px-3.5 border border-[#ded8ca] rounded-xl bg-white text-brand-text text-[14px] font-semibold focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all placeholder:text-gray-300"
                />
              </label>
              
              <label className="flex items-center gap-2.5 text-brand-text text-[13px] font-bold cursor-pointer mt-1 select-none">
                <input
                  type="checkbox"
                  checked={userForm.active}
                  onChange={(event) => setUserForm((current) => ({ ...current, active: event.target.checked }))}
                  className="w-4.5 h-4.5 accent-[#003ec7] rounded"
                />
                Active account
              </label>
              
              <div className="flex items-center gap-2.5 mt-4">
                <button 
                  className="flex-1 min-h-[48px] rounded-xl font-bold bg-[#003ec7] hover:bg-[#003ec7]/90 active:scale-[0.98] transition-all text-white border-0 cursor-pointer shadow-sm" 
                  type="submit"
                >
                  {userForm.id ? 'Save user' : 'Add user'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 min-h-[48px] border border-[#d9d0c1] rounded-xl bg-white text-brand-text font-bold hover:bg-gray-50 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
