import { useState } from 'react';
import { TONES } from '../../../data/seedData';
import OwnerCrudTable from './OwnerCrudTable';
import FormInput from '../../../components/ui/FormInput';
import FormSelect from '../../../components/ui/FormSelect';
import FormActions from '../../../components/ui/FormActions';
import StatusBadge from '../../../components/ui/StatusBadge';
import Icon from '../../../components/ui/Icon';
import useOwnerForm from '../../../hooks/useOwnerForm';
import { getToneSwatchClass, getToneBadgeClass } from '../../../utils/toneClasses';
import { money } from '../../../utils/format';

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
      <div className={`flex min-w-0 w-full flex-col rounded-md transition-colors ${isExpanded ? 'bg-brand-action/8' : ''}`}>
        <div className="flex items-center justify-between gap-3.5 min-w-0">
          <div className="flex items-center gap-3.5">
            <button 
              type="button" 
              onClick={() => toggleExpand(category.id)}
              className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border transition-colors ${
                isExpanded
                  ? 'border-brand-action bg-brand-action text-[#090807]'
                  : 'border-ui-border bg-ui-muted text-text-soft hover:border-brand-action/60 hover:bg-brand-action/12 hover:text-brand-action'
              }`}
              aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${category.name}`}
              aria-expanded={Boolean(isExpanded)}
            >
              <Icon name="chevronDown" className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            <span className={`h-7 w-7 shrink-0 rounded-full border border-ui-border shadow-sm ${getToneSwatchClass(category.tone)}`} />
            <div>
              <strong className="block text-[15px] font-bold text-text-strong">{category.name}</strong>
              <button
                type="button"
                className="mt-0.5 block cursor-pointer border-0 bg-transparent p-0 text-xs font-bold text-text-soft hover:text-brand-action hover:underline"
                onClick={() => toggleExpand(category.id)}
              >
                {categoryProducts.length} items
              </button>
            </div>
          </div>
        </div>

        {isExpanded && categoryProducts.length > 0 && (
          <div className="ml-10 mt-4 flex flex-col gap-3 border-l-2 border-brand-action/35 pl-4">
            {categoryProducts.map((product) => (
              <div key={product.id} className="flex min-w-0 items-center gap-3.5 rounded-md border border-ui-border bg-ui-muted p-2 transition-colors hover:border-brand-action/60 hover:bg-brand-action/10">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-10 w-10 shrink-0 rounded-md border border-ui-border bg-ui-surface object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-ui-border bg-ui-surface text-[9px] font-bold text-text-soft">
                    No img
                  </div>
                )}
                <div className="min-w-0 space-y-1">
                  <strong className="block truncate text-[14px] font-bold leading-none text-text-strong">
                    {product.name}
                  </strong>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded border border-ui-border bg-ui-surface px-1.5 py-0.5 font-mono text-[11px] font-bold tracking-tight text-text-soft">
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
    <OwnerCrudTable
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
