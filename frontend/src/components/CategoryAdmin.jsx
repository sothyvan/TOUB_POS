import { useState } from 'react';
import { TONES } from '../data/seedData';

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

  return (
    <div className="w-full">
      {/* Categories List Card */}
      <div className="border border-[#ded8ca] rounded-[24px] bg-[#fffdfa] shadow-[0_12px_36px_rgba(52,45,35,0.04)] p-6 grid gap-2">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-2">
          <h3 className="m-0 text-brand-dark text-lg font-black tracking-tight">Categories</h3>
          <button
            type="button"
            onClick={handleAddNewClick}
            className="min-h-[38px] px-4 rounded-full bg-[#003ec7] text-white text-xs font-bold hover:bg-[#003ec7]/90 active:scale-95 transition-all cursor-pointer shadow-sm flex items-center gap-1"
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Category
          </button>
        </div>

        {categories.map((category) => (
          <div 
            className="py-4.5 px-0 border-t border-gray-100 grid grid-cols-[minmax(0,1fr)_auto] gap-4 items-center first-of-type:border-t-0" 
            key={category.id}
          >
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
            
            <div className="flex items-center gap-2 max-[768px]:justify-start">
              <button
                type="button"
                onClick={() => onEdit(category)}
                title="Edit category"
                aria-label="Edit category"
                className="w-9 h-9 border border-[#d9d0c1] rounded-full bg-white text-[#4f483f] flex items-center justify-center transition-all cursor-pointer active:scale-95 hover:bg-[#003ec7] hover:text-white hover:border-[#003ec7]"
              >
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onDelete(category.id)}
                title="Delete category"
                aria-label="Delete category"
                className="w-9 h-9 border border-[#d9d0c1] rounded-full bg-white text-[#4f483f] flex items-center justify-center transition-all cursor-pointer active:scale-95 hover:bg-[#c70000] hover:text-white hover:border-[#c70000]"
              >
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Overlay Modal for Create/Edit Category */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#23211f]/40 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={handleCancel} />
          
          <div className="relative w-full max-w-[420px] border border-[#ded8ca] rounded-[24px] bg-[#fffdfa] shadow-[0_20px_50px_rgba(52,45,35,0.15)] p-6 z-10">
            {/* Close Button */}
            <button
              type="button"
              onClick={handleCancel}
              className="absolute top-5 right-5 w-8.5 h-8.5 rounded-full border border-[#d9d0c1] bg-white text-[#4f483f] grid place-items-center hover:bg-gray-150 cursor-pointer transition-all active:scale-90"
              aria-label="Close category form"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <form className="grid gap-4.5" onSubmit={handleSubmit}>
              <h3 className="m-0 text-brand-dark text-lg font-black tracking-tight border-b border-gray-100 pb-3">
                {categoryForm.id ? 'Edit category' : 'Create category'}
              </h3>
              
              <label className="grid gap-1.5 text-brand-text text-[13px] font-bold">
                Name
                <input
                  value={categoryForm.name}
                  onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Smoothies"
                  required
                  className="w-full min-h-[46px] px-3.5 border border-[#ded8ca] rounded-xl bg-white text-brand-text text-[14px] font-semibold focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all placeholder:text-gray-300"
                />
              </label>
              
              <label className="grid gap-1.5 text-brand-text text-[13px] font-bold">
                Color Tone
                <select
                  value={categoryForm.tone}
                  onChange={(event) => setCategoryForm((current) => ({ ...current, tone: event.target.value }))}
                  className="w-full min-h-[46px] px-3.5 border border-[#ded8ca] rounded-xl bg-white text-brand-text text-[14px] font-semibold focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all"
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
                  className="flex-1 min-h-[48px] rounded-xl font-bold bg-[#003ec7] hover:bg-[#003ec7]/90 active:scale-[0.98] transition-all text-white border-0 cursor-pointer shadow-sm" 
                  type="submit"
                >
                  {categoryForm.id ? 'Save category' : 'Add category'}
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
