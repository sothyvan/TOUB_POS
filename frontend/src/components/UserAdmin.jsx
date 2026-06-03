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
  const handleSubmit = (event) => {
    event.preventDefault();
    onSave();
  };

  return (
    <section className="grid grid-cols-[minmax(280px,380px)_minmax(0,1fr)] gap-4.5 items-start max-[768px]:grid-cols-1">
      <form className="border border-[#ded8ca] rounded-lg bg-[#fffdfa] shadow-[0_10px_24px_rgba(52,45,35,0.07)] p-4.5 grid gap-3.5" onSubmit={handleSubmit}>
        <h3 className="m-0 text-brand-dark text-lg font-bold">{userForm.id ? 'Edit user' : 'Create user'}</h3>
        <label className="grid gap-1.75 text-[#5c544a] text-[13px] font-black">
          Name
          <input
            value={userForm.name}
            onChange={(event) => setUserForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Sokha"
            className="w-full min-h-[44px] px-3 border border-[#d9d0c1] rounded-lg bg-white text-brand-text text-[15px] font-semibold"
          />
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          <label className="grid gap-1.75 text-[#5c544a] text-[13px] font-black">
            Role
            <select
              value={userForm.role}
              onChange={(event) => setUserForm((current) => ({ ...current, role: event.target.value }))}
              className="w-full min-h-[44px] px-3 border border-[#d9d0c1] rounded-lg bg-white text-brand-text text-[15px] font-semibold"
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.75 text-[#5c544a] text-[13px] font-black">
            PIN
            <input
              type="password"
              inputMode="numeric"
              value={userForm.pin}
              onChange={(event) => setUserForm((current) => ({ ...current, pin: event.target.value }))}
              placeholder="4 digits"
              className="w-full min-h-[44px] px-3 border border-[#d9d0c1] rounded-lg bg-white text-brand-text text-[15px] font-semibold"
            />
          </label>
        </div>
        <label className="grid gap-1.75 text-[#5c544a] text-[13px] font-black">
          Station
          <input
            value={userForm.station}
            onChange={(event) => setUserForm((current) => ({ ...current, station: event.target.value }))}
            placeholder="Station 02"
            className="w-full min-h-[44px] px-3 border border-[#d9d0c1] rounded-lg bg-white text-brand-text text-[15px] font-semibold"
          />
        </label>
        <label className="flex items-center gap-2.5 text-[#5c544a] text-[13px] font-black cursor-pointer">
          <input
            type="checkbox"
            checked={userForm.active}
            onChange={(event) => setUserForm((current) => ({ ...current, active: event.target.checked }))}
            className="w-4.5 h-4.5 accent-brand-primary"
          />
          Active account
        </label>
        <div className="flex items-center gap-2.5">
          <button className="flex-1 min-h-[48px] border rounded-lg font-black cursor-pointer border-[#24211f] bg-[#24211f] text-[#fff9ee]" type="submit">
            {userForm.id ? 'Save user' : 'Add user'}
          </button>
          {userForm.id ? (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 min-h-[48px] border border-[#d9d0c1] rounded-lg bg-white text-[#4f483f] font-black cursor-pointer"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="border border-[#ded8ca] rounded-lg bg-[#fffdfa] shadow-[0_10px_24px_rgba(52,45,35,0.07)] p-4.5 grid gap-2.5">
        <h3 className="m-0 text-brand-dark text-lg font-bold">Users</h3>
        {users.map((user) => (
          <div className="py-3.25 px-0 border-t border-[#eee7db] grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-center first-of-type:border-t-0" key={user.id}>
            <div>
              <strong className="block text-brand-text text-[15px] font-bold">{user.name}</strong>
              <span className="block mt-1 text-brand-subtext text-[13px] font-bold">
                {user.role} - {user.station} - {user.active ? 'Active' : 'Disabled'}
              </span>
            </div>
            <div className="flex items-center gap-2 max-[768px]:justify-start max-[768px]:flex-wrap">
              <button
                type="button"
                onClick={() => onEdit(user)}
                className="min-h-[34px] px-2.75 border border-[#d9d0c1] rounded-full bg-white text-[#4f483f] text-xs font-black cursor-pointer"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onToggleActive(user.id)}
                className="min-h-[34px] px-2.75 border border-[#d9d0c1] rounded-full bg-white text-[#4f483f] text-xs font-black cursor-pointer"
              >
                {user.active ? 'Disable' : 'Enable'}
              </button>
              <button
                type="button"
                onClick={() => onDelete(user.id)}
                className="min-h-[34px] px-2.75 border border-[#d9d0c1] rounded-full bg-white text-[#4f483f] text-xs font-black cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
