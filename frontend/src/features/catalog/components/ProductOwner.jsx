import { TONES } from '../../../data/seedData';
import { money } from '../../../utils/format';
import OwnerCrudTable from './OwnerCrudTable';
import FormInput from '../../../components/ui/FormInput';
import FormSelect from '../../../components/ui/FormSelect';
import FormCheckbox from '../../../components/ui/FormCheckbox';
import FormActions from '../../../components/ui/FormActions';
import StatusBadge from '../../../components/ui/StatusBadge';
import useOwnerForm from '../../../hooks/useOwnerForm';
import { getToneBadgeClass } from '../../../utils/toneClasses';

export default function ProductOwner({
  productForm,
  setProductForm,
  categories,
  categoryById,
  products,
  onSave,
  onEdit,
  onToggleAvailability,
  onDelete,
  onCancel,
}) {
  const { isFormOpen, handleSubmit, handleCancel, handleAddNewClick } =
    useOwnerForm(productForm, { onSave, onCancel });

  const renderProduct = (product) => {
    const category = categoryById.get(product.categoryId);
    const tone = category?.tone || 'gold';
    const badgeClass = getToneBadgeClass(tone);

    return (
      <div className="flex items-center gap-3.5 min-w-0">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-11 h-11 rounded-xl object-cover shrink-0 border border-brand-border shadow-sm bg-white"
            loading="lazy"
          />
        ) : (
          <div className="w-11 h-11 rounded-xl bg-[#eee7db] shrink-0 flex items-center justify-center text-[10px] text-gray-500 font-bold border border-brand-border">
            No img
          </div>
        )}
        <div className="min-w-0 space-y-1">
          <strong className="block text-brand-text text-[15px] font-bold truncate leading-none">
            {product.name}
          </strong>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-gray-400 font-mono tracking-tight bg-gray-50 px-1.5 py-0.5 rounded border border-gray-150">
              {product.code}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${badgeClass}`}>
              {category?.name || 'No category'}
            </span>
            <span className="text-[13px] font-black text-brand-action">
              {money(product.price)}
            </span>
            <StatusBadge active={product.available} activeLabel="Visible" inactiveLabel="Hidden" />
          </div>
        </div>
      </div>
    );
  };

  const renderForm = ({ onCancel }) => (
    <form className="grid gap-4.5" onSubmit={handleSubmit}>
      <FormInput
        label="Name"
        value={productForm.name}
        onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))}
        placeholder="Brown sugar latte"
        required
      />

      <FormInput
        label="Image URL"
        value={productForm.image || ''}
        onChange={(event) => setProductForm((current) => ({ ...current, image: event.target.value }))}
        placeholder="/images/brown_sugar_latte.png"
      />

      <div className="grid grid-cols-2 gap-3">
        <FormInput
          label="Code"
          value={productForm.code}
          onChange={(event) => setProductForm((current) => ({ ...current, code: event.target.value }))}
          placeholder="BSL"
          required
        />
        <FormInput
          label="Price"
          type="number"
          min="0"
          step="0.01"
          value={productForm.price}
          onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))}
          placeholder="1.50"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormSelect
          label="Category"
          value={productForm.categoryId || ''}
          required
          onChange={(event) => {
            const category = categoryById.get(event.target.value);
            setProductForm((current) => ({
              ...current,
              categoryId: event.target.value,
              tone: category?.tone || current.tone,
            }));
          }}
        >
          {categories.length === 0 ? (
            <option value="" disabled>No categories available</option>
          ) : (
            <>
              <option value="" disabled>-- Select --</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </>
          )}
        </FormSelect>
        <FormSelect
          label="Color Tone"
          value={productForm.tone}
          onChange={(event) => setProductForm((current) => ({ ...current, tone: event.target.value }))}
        >
          {TONES.map((tone) => (
            <option key={tone} value={tone}>
              {tone}
            </option>
          ))}
        </FormSelect>
      </div>

      <FormCheckbox
        label="Available for sale"
        checked={productForm.available}
        onChange={(event) =>
          setProductForm((current) => ({ ...current, available: event.target.checked }))
        }
      />

      <FormActions submitLabel={productForm.id ? 'Save item' : 'Add item'} onCancel={onCancel} />
    </form>
  );

  return (
    <OwnerCrudTable
      title="Items"
      items={products}
      renderItem={renderProduct}
      itemLabel="product"
      addButtonLabel="Add Item"
      onAdd={handleAddNewClick}
      onEdit={onEdit}
      onToggle={onToggleAvailability}
      toggleLabel={(product) => (product.available ? 'Hide' : 'Show')}
      onDelete={onDelete}
      isFormOpen={isFormOpen}
      modalTitle={productForm.id ? 'Edit item' : 'Create item'}
      modalMaxWidth="max-w-110"
      modalScroll
      onFormClose={handleCancel}
      formContent={renderForm}
    />
  );
}
