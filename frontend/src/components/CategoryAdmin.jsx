import { TONES } from '../data/seedData';
import AdminCRUDTable from './common/AdminCrudTable';
import FormInput from './ui/FormInput';
import FormSelect from './ui/FormSelect';
import FormActions from './ui/FormActions';
import useAdminForm from '../hooks/useAdminForm';
import { getToneSwatchClass } from '../utils/toneClasses';

export default function CategoryAdmin({
  categoryForm,
  setCategoryForm,
  categories,
  products,
  onSave,
  onEdit,
  onDelete,
  onCancel,
}) {
  const { isFormOpen, handleSubmit, handleCancel, handleAddNewClick } =
    useAdminForm(categoryForm, { onSave, onCancel });

  const renderCategory = (category) => (
    <div className="flex items-center gap-3.5 min-w-0">
      <span className={`w-6.5 h-6.5 rounded-full border border-gray-250 shrink-0 shadow-sm ${getToneSwatchClass(category.tone)}`} />
      <div>
        <strong className="block text-brand-text text-[15px] font-bold">{category.name}</strong>
        <span className="block mt-0.5 text-gray-400 text-xs font-bold">
          {products.filter((product) => product.categoryId === category.id).length} items
        </span>
      </div>
    </div>
  );

  const renderForm = ({ onCancel }) => (
    <form className="grid gap-4.5" onSubmit={handleSubmit}>
      <FormInput
        label="Name"
        value={categoryForm.name}
        onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))}
        placeholder="Smoothies"
        required
      />

      <FormSelect
        label="Color Tone"
        value={categoryForm.tone}
        onChange={(event) => setCategoryForm((current) => ({ ...current, tone: event.target.value }))}
      >
        {TONES.map((tone) => (
          <option key={tone} value={tone}>
            {tone}
          </option>
        ))}
      </FormSelect>

      <FormActions submitLabel={categoryForm.id ? 'Save category' : 'Add category'} onCancel={onCancel} />
    </form>
  );

  return (
    <AdminCRUDTable
      title="Categories"
      items={categories}
      renderItem={renderCategory}
      itemLabel="category"
      addButtonLabel="Add Category"
      onAdd={handleAddNewClick}
      onEdit={onEdit}
      onDelete={onDelete}
      isFormOpen={isFormOpen}
      modalTitle={categoryForm.id ? 'Edit category' : 'Create category'}
      onFormClose={handleCancel}
      formContent={renderForm}
    />
  );
}
