import { useState } from 'react';
import { TONES } from '../data/seedData';
import AdminCRUDTable from './common/AdminCRUDTable';

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
  const [isAddingNew, setIsAddingNew] = useState(false);
  const isFormOpen = Boolean(categoryForm.id) || isAddingNew;

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

  const renderCategory = (category) => (
    <div className="flex items-center gap-3.5 min-w-0">
      <span className={`w-6.5 h-6.5 rounded-full border border-gray-250 shrink-0 shadow-sm ${
        category.tone === 'gold' ? 'bg-[#f8d36b]' :
        category.tone === 'green' ? 'bg-[#79b991]' :
        category.tone === 'blue' ? 'bg-[#8cb8c5]' :
        category.tone === 'rose' ? 'bg-[#e6a48f]' : ''
      }`} />
      <div>
        <strong className="block text-brand-text text-[15px] font-bold">{category.name}</strong>
        <span className="block mt-0.5 text-gray-400 text-xs font-bold">
          {products.filter((product) => product.categoryId === category.id).length} items
        </span>
      </div>
    </div>
  );

  const renderForm = () => (
    <form className="grid gap-4.5" onSubmit={handleSubmit}>
      <label className="grid gap-1.5 text-brand-text text-[13px] font-bold">
        Name
        <input
          value={categoryForm.name}
          onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))}
          placeholder="Smoothies"
          required
          className="w-full min-h-11.5 px-3.5 border border-brand-border rounded-xl bg-white text-brand-text text-[14px] font-semibold focus:border-brand-action focus:ring-1 focus:ring-brand-action outline-none transition-all placeholder:text-gray-300"
        />
      </label>

      <label className="grid gap-1.5 text-brand-text text-[13px] font-bold">
        Color Tone
        <select
          value={categoryForm.tone}
          onChange={(event) => setCategoryForm((current) => ({ ...current, tone: event.target.value }))}
          className="w-full min-h-11.5 px-3.5 border border-brand-border rounded-xl bg-white text-brand-text text-[14px] font-semibold focus:border-brand-action focus:ring-1 focus:ring-brand-action outline-none transition-all"
        >
          {TONES.map((tone) => (
            <option key={tone} value={tone}>
              {tone}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-2.5 mt-4">
        <button
          className="flex-1 min-h-12 rounded-xl font-bold bg-brand-action hover:bg-brand-action/90 active:scale-[0.98] transition-all text-white border-0 cursor-pointer shadow-sm"
          type="submit"
        >
          {categoryForm.id ? 'Save category' : 'Add category'}
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
