import { ROLES } from '../data/seedData';
import AdminCRUDTable from './common/AdminCrudTable';
import FormInput from './ui/FormInput';
import FormSelect from './ui/FormSelect';
import FormCheckbox from './ui/FormCheckbox';
import FormActions from './ui/FormActions';
import StatusBadge from './ui/StatusBadge';
import useAdminForm from '../hooks/useAdminForm';

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
  const { isFormOpen, handleSubmit, handleCancel, handleAddNewClick } =
    useAdminForm(userForm, { onSave, onCancel });

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
          <StatusBadge active={user.active} activeLabel="Active" inactiveLabel="Disabled" />
        </div>
      </div>
    );
  };

  const renderForm = ({ onCancel }) => (
    <form className="grid gap-4.5" onSubmit={handleSubmit}>
      <FormInput
        label="Name"
        value={userForm.name}
        onChange={(event) => setUserForm((current) => ({ ...current, name: event.target.value }))}
        placeholder="Sokha"
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <FormSelect
          label="Role"
          value={userForm.role}
          onChange={(event) => setUserForm((current) => ({ ...current, role: event.target.value }))}
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </FormSelect>
        <FormInput
          label="PIN"
          type="password"
          inputMode="numeric"
          value={userForm.pin}
          onChange={(event) => setUserForm((current) => ({ ...current, pin: event.target.value }))}
          placeholder="4 digits"
          required={!userForm.id}
        />
      </div>

      <FormInput
        label="Station"
        value={userForm.station}
        onChange={(event) => setUserForm((current) => ({ ...current, station: event.target.value }))}
        placeholder="Station 02"
        required
      />

      <FormCheckbox
        label="Active account"
        checked={userForm.active}
        onChange={(event) => setUserForm((current) => ({ ...current, active: event.target.checked }))}
      />

      <FormActions submitLabel={userForm.id ? 'Save user' : 'Add user'} onCancel={onCancel} />
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
