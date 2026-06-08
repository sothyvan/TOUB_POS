import { useState } from 'react';
import { money } from '../utils/format';
import { TONES } from '../data/seedData';

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

  return (
    <div className="w-full">
      {/* Items List Card */}
      <div className="border border-[#ded8ca] rounded-[24px] bg-[#fffdfa] shadow-[0_12px_36px_rgba(52,45,35,0.04)] p-6 grid gap-2">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-2">
          <h3 className="m-0 text-brand-dark text-lg font-black tracking-tight">Items</h3>
          <button
            type="button"
            onClick={handleAddNewClick}
            className="min-h-[38px] px-4 rounded-full bg-[#003ec7] text-white text-xs font-bold hover:bg-[#003ec7]/90 active:scale-95 transition-all cursor-pointer shadow-sm flex items-center gap-1"
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Item
          </button>
        </div>

        {products.map((product) => {
          const category = categoryById.get(product.categoryId);
          const tone = category?.tone || 'gold';
          const badgeClass =
            tone === 'green' ? 'bg-[#e6f4eb] text-[#126149] border-[#b9dec9]' :
            tone === 'blue' ? 'bg-[#e6f2f7] text-[#1f6278] border-[#aed3df]' :
            tone === 'rose' ? 'bg-[#fdf0ec] text-[#8c3d2b] border-[#f4cfc3]' :
            'bg-[#fdf7e7] text-[#785315] border-[#f4dfb5]'; // gold

          return (
            <div 
              className="py-4.5 px-0 border-t border-gray-100 grid grid-cols-[minmax(0,1fr)_auto] gap-4 items-center first-of-type:border-t-0" 
              key={product.id}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {product.image ? (
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-11 h-11 rounded-xl object-cover shrink-0 border border-[#ded8ca] shadow-sm bg-white" 
                  />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-[#eee7db] shrink-0 flex items-center justify-center text-[10px] text-gray-500 font-bold border border-[#ded8ca]">
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
                    <span className="text-[13px] font-black text-[#003ec7]">
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
              
              <div className="flex items-center gap-2 max-[768px]:justify-start">
                <button
                  type="button"
                  onClick={() => onEdit(product)}
                  title="Edit product"
                  aria-label="Edit product"
                  className="w-9 h-9 border border-[#d9d0c1] rounded-full bg-white text-[#4f483f] flex items-center justify-center transition-all cursor-pointer active:scale-95 hover:bg-[#003ec7] hover:text-white hover:border-[#003ec7]"
                >
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleAvailability(product.id)}
                  title={product.available ? 'Hide product' : 'Show product'}
                  aria-label={product.available ? 'Hide product' : 'Show product'}
                  className="w-9 h-9 border border-[#d9d0c1] rounded-full bg-white text-[#4f483f] flex items-center justify-center transition-all cursor-pointer active:scale-95 hover:bg-gray-150 hover:text-brand-dark"
                >
                  {product.available ? (
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(product.id)}
                  title="Delete product"
                  aria-label="Delete product"
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

      {/* Overlay Modal for Create/Edit */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#23211f]/40 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={handleCancel} />
          
          <div className="relative w-full max-w-[440px] border border-[#ded8ca] rounded-[24px] bg-[#fffdfa] shadow-[0_20px_50px_rgba(52,45,35,0.15)] p-6 z-10 max-h-[90svh] overflow-y-auto">
            {/* Close Button */}
            <button
              type="button"
              onClick={handleCancel}
              className="absolute top-5 right-5 w-8.5 h-8.5 rounded-full border border-[#d9d0c1] bg-white text-[#4f483f] grid place-items-center hover:bg-gray-150 cursor-pointer transition-all active:scale-90"
              aria-label="Close form"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <form className="grid gap-4.5" onSubmit={handleSubmit}>
              <h3 className="m-0 text-brand-dark text-lg font-black tracking-tight border-b border-gray-100 pb-3">
                {productForm.id ? 'Edit item' : 'Create item'}
              </h3>
              
              <label className="grid gap-1.5 text-brand-text text-[13px] font-bold">
                Name
                <input
                  value={productForm.name}
                  onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Brown sugar latte"
                  required
                  className="w-full min-h-[46px] px-3.5 border border-[#ded8ca] rounded-xl bg-white text-brand-text text-[14px] font-semibold focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all placeholder:text-gray-300"
                />
              </label>
              
              <label className="grid gap-1.5 text-brand-text text-[13px] font-bold">
                Image URL
                <input
                  value={productForm.image || ''}
                  onChange={(event) => setProductForm((current) => ({ ...current, image: event.target.value }))}
                  placeholder="/images/brown_sugar_latte.png"
                  className="w-full min-h-[46px] px-3.5 border border-[#ded8ca] rounded-xl bg-white text-brand-text text-[14px] font-semibold focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all placeholder:text-gray-300"
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
                    className="w-full min-h-[46px] px-3.5 border border-[#ded8ca] rounded-xl bg-white text-brand-text text-[14px] font-semibold focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all placeholder:text-gray-300"
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
                    className="w-full min-h-[46px] px-3.5 border border-[#ded8ca] rounded-xl bg-white text-brand-text text-[14px] font-semibold focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all placeholder:text-gray-300"
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
                    className="w-full min-h-[46px] px-3.5 border border-[#ded8ca] rounded-xl bg-white text-brand-text text-[14px] font-semibold focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all"
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
                    className="w-full min-h-[46px] px-3.5 border border-[#ded8ca] rounded-xl bg-white text-brand-text text-[14px] font-semibold focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all"
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
                  className="w-4.5 h-4.5 accent-[#003ec7] rounded"
                />
                Available for sale
              </label>
              
              <div className="flex items-center gap-2.5 mt-4">
                <button 
                  className="flex-1 min-h-[48px] rounded-xl font-bold bg-[#003ec7] hover:bg-[#003ec7]/90 active:scale-[0.98] transition-all text-white border-0 cursor-pointer shadow-sm" 
                  type="submit"
                >
                  {productForm.id ? 'Save item' : 'Add item'}
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
