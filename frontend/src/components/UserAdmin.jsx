const ROLES = ['Admin', 'Manager', 'Cashier'];

const blankUserForm = () => ({
  id: null,
  name: '',
  role: 'Cashier',
  station: 'Station 01',
  pin: '',
  active: true,
});

export default function UserAdmin({
  userForm,
  setUserForm,
  users,
  onSave,
  onEdit,
  onToggleActive,
  onDelete,
}) {
  const handleSubmit = (event) => {
    event.preventDefault();
    onSave();
  };

  return (
    <section className="admin-grid">
      <form className="admin-form" onSubmit={handleSubmit}>
        <h3>{userForm.id ? 'Edit user' : 'Create user'}</h3>
        <label>
          Name
          <input
            value={userForm.name}
            onChange={(event) => setUserForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Sokha"
          />
        </label>
        <div className="form-row">
          <label>
            Role
            <select
              value={userForm.role}
              onChange={(event) => setUserForm((current) => ({ ...current, role: event.target.value }))}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <label>
            PIN
            <input
              type="password"
              inputMode="numeric"
              value={userForm.pin}
              onChange={(event) => setUserForm((current) => ({ ...current, pin: event.target.value }))}
              placeholder="4 digits"
            />
          </label>
        </div>
        <label>
          Station
          <input
            value={userForm.station}
            onChange={(event) => setUserForm((current) => ({ ...current, station: event.target.value }))}
            placeholder="Station 02"
          />
        </label>
        <label className="check-line">
          <input
            type="checkbox"
            checked={userForm.active}
            onChange={(event) => setUserForm((current) => ({ ...current, active: event.target.checked }))}
          />
          Active account
        </label>
        <div className="form-actions">
          <button className="admin-primary" type="submit">
            {userForm.id ? 'Save user' : 'Add user'}
          </button>
          {userForm.id ? (
            <button type="button" onClick={() => setUserForm(blankUserForm())}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="admin-list">
        <h3>Users</h3>
        {users.map((user) => (
          <div className="admin-row" key={user.id}>
            <div>
              <strong>{user.name}</strong>
              <span>
                {user.role} - {user.station} - {user.active ? 'Active' : 'Disabled'}
              </span>
            </div>
            <div className="row-actions">
              <button type="button" onClick={() => onEdit(user)}>
                Edit
              </button>
              <button type="button" onClick={() => onToggleActive(user.id)}>
                {user.active ? 'Disable' : 'Enable'}
              </button>
              <button type="button" onClick={() => onDelete(user.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
