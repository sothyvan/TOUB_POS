import { useState } from 'react';
import { TONES } from '../data/seedData';
import OwnerCRUDTable from './common/OwnerCrudTable';
import FormInput from './ui/FormInput';
import FormSelect from './ui/FormSelect';
import FormActions from './ui/FormActions';
import StatusBadge from './ui/StatusBadge';
import Icon from './ui/Icon';
import useOwnerForm from '../hooks/useOwnerForm';
import { getToneSwatchClass, getToneBadgeClass } from '../utils/toneClasses';
import { money } from '../utils/format';

export default function CategoryOwner({
  categoryForm,
  setCategoryForm,
  categories,
  products,
  onSave,
  onEdit,
  onDelete,
  onCancel,
  loading,
  error,
}) {
  const { isFormOpen, handleSubmit, handleCancel, handleAddNewClick } =
    useOwnerForm(categoryForm, { onSave, onCancel });

  const [expandedCats, setExpandedCats] = useState({});

  const toggleExpand = (id) => {
    setExpandedCats((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderCategory = (category) => {
    const categoryProducts = products.filter((product) => product.categoryId === category.id);
    const isExpanded = expandedCats[category.id];

    return (
      <div className="flex flex-col min-w-0 w-full">
        <div className="flex items-center justify-between gap-3.5 min-w-0">
          <div className="flex items-center gap-3.5">
            <button 
              type="button" 
              onClick={() => toggleExpand(category.id)}
              className="w-6.5 h-6.5 rounded-full flex items-center justify-center border-0 bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors"
            >
              <Icon name="chevronDown" className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            <span className={`w-6.5 h-6.5 rounded-full border border-gray-250 shrink-0 shadow-sm ${getToneSwatchClass(category.tone)}`} />
            <div>
              <strong className="block text-brand-text text-[15px] font-bold">{category.name}</strong>
              <span className="block mt-0.5 text-gray-400 text-xs font-bold cursor-pointer hover:underline" onClick={() => toggleExpand(category.id)}>
                {categoryProducts.length} items
              </span>
            </div>
          </div>
        </div>

        {isExpanded && categoryProducts.length > 0 && (
          <div className="flex flex-col gap-3 mt-4 ml-10 pl-4 border-l-2 border-gray-100">
            {categoryProducts.map((product) => (
              <div key={product.id} className="flex items-center gap-3.5 min-w-0 bg-gray-50/50 p-2 rounded-xl border border-gray-100">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-10 h-10 rounded-xl object-cover shrink-0 border border-brand-border shadow-sm bg-white"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-[#eee7db] shrink-0 flex items-center justify-center text-[9px] text-gray-500 font-bold border border-brand-border">
                    No img
                  </div>
                )}
                <div className="min-w-0 space-y-1">
                  <strong className="block text-brand-text text-[14px] font-bold truncate leading-none">
                    {product.name}
                  </strong>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-gray-400 font-mono tracking-tight bg-white px-1.5 py-0.5 rounded border border-gray-150">
                      {product.code}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border ${getToneBadgeClass(category.tone)}`}>
                      {category.name}
                    </span>
                    <span className="text-[12px] font-black text-brand-action">
                      {money(product.price)}
                    </span>
                    <StatusBadge active={product.available} activeLabel="Visible" inactiveLabel="Hidden" className="scale-90 origin-left" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

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
    <OwnerCRUDTable
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
      loading={loading}
      error={error}
    />
  );
}
