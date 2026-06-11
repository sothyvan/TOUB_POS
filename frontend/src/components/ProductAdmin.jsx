import { useState } from 'react';
import { TONES } from '../data/seedData';
import { money } from '../utils/format';
import AdminCRUDTable from './common/AdminCRUDTable';

export default function ProductAdmin({
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
  const [isAddingNew, setIsAddingNew] = useState(false);
  const isFormOpen = Boolean(productForm.id) || isAddingNew;

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

  const renderProduct = (product) => {
    const category = categoryById.get(product.categoryId);
    const tone = category?.tone || 'gold';
    const badgeClass =
      tone === 'green' ? 'bg-[#e6f4eb] text-[#126149] border-[#b9dec9]' :
      tone === 'blue' ? 'bg-[#e6f2f7] text-[#1f6278] border-[#aed3df]' :
      tone === 'rose' ? 'bg-[#fdf0ec] text-[#8c3d2b] border-[#f4cfc3]' :
      'bg-[#fdf7e7] text-[#785315] border-[#f4dfb5]';

    return (
      <div className="flex items-center gap-3.5 min-w-0">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-11 h-11 rounded-xl object-cover shrink-0 border border-brand-border shadow-sm bg-white"
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
            {product.available ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-[#e6f4eb] text-[#126149] border border-[#b9dec9]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#19a86f]" />
                Visible
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-gray-100 text-gray-500 border border-gray-200">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                Hidden
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderForm = () => (
    <form className="grid gap-4.5" onSubmit={handleSubmit}>
      <label className="grid gap-1.5 text-brand-text text-[13px] font-bold">
        Name
        <input
          value={productForm.name}
          onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))}
          placeholder="Brown sugar latte"
          required
          className="w-full min-h-11.5 px-3.5 border border-brand-border rounded-xl bg-white text-brand-text text-[14px] font-semibold focus:border-brand-action focus:ring-1 focus:ring-brand-action outline-none transition-all placeholder:text-gray-300"
        />
      </label>

      <label className="grid gap-1.5 text-brand-text text-[13px] font-bold">
        Image URL
        <input
          value={productForm.image || ''}
          onChange={(event) => setProductForm((current) => ({ ...current, image: event.target.value }))}
          placeholder="/images/brown_sugar_latte.png"
          className="w-full min-h-11.5 px-3.5 border border-brand-border rounded-xl bg-white text-brand-text text-[14px] font-semibold focus:border-brand-action focus:ring-1 focus:ring-brand-action outline-none transition-all placeholder:text-gray-300"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1.5 text-brand-text text-[13px] font-bold">
          Code
          <input
            value={productForm.code}
            onChange={(event) => setProductForm((current) => ({ ...current, code: event.target.value }))}
            placeholder="BSL"
            required
            className="w-full min-h-11.5 px-3.5 border border-brand-border rounded-xl bg-white text-brand-text text-[14px] font-semibold focus:border-brand-action focus:ring-1 focus:ring-brand-action outline-none transition-all placeholder:text-gray-300"
          />
        </label>
        <label className="grid gap-1.5 text-brand-text text-[13px] font-bold">
          Price
          <input
            type="number"
            min="0"
            step="0.01"
            value={productForm.price}
            onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))}
            placeholder="1.50"
            required
            className="w-full min-h-11.5 px-3.5 border border-brand-border rounded-xl bg-white text-brand-text text-[14px] font-semibold focus:border-brand-action focus:ring-1 focus:ring-brand-action outline-none transition-all placeholder:text-gray-300"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1.5 text-brand-text text-[13px] font-bold">
          Category
          <select
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
            className="w-full min-h-11.5 px-3.5 border border-brand-border rounded-xl bg-white text-brand-text text-[14px] font-semibold focus:border-brand-action focus:ring-1 focus:ring-brand-action outline-none transition-all"
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
          </select>
        </label>
        <label className="grid gap-1.5 text-brand-text text-[13px] font-bold">
          Color Tone
          <select
            value={productForm.tone}
            onChange={(event) => setProductForm((current) => ({ ...current, tone: event.target.value }))}
            className="w-full min-h-11.5 px-3.5 border border-brand-border rounded-xl bg-white text-brand-text text-[14px] font-semibold focus:border-brand-action focus:ring-1 focus:ring-brand-action outline-none transition-all"
          >
            {TONES.map((tone) => (
              <option key={tone} value={tone}>
                {tone}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex items-center gap-2.5 text-brand-text text-[13px] font-bold cursor-pointer mt-1 select-none">
        <input
          type="checkbox"
          checked={productForm.available}
          onChange={(event) =>
            setProductForm((current) => ({ ...current, available: event.target.checked }))
          }
          className="w-4.5 h-4.5 accent-brand-action rounded"
        />
        Available for sale
      </label>

      <div className="flex items-center gap-2.5 mt-4">
        <button
          className="flex-1 min-h-12 rounded-xl font-bold bg-brand-action hover:bg-brand-action/90 active:scale-[0.98] transition-all text-white border-0 cursor-pointer shadow-sm"
          type="submit"
        >
          {productForm.id ? 'Save item' : 'Add item'}
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
