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
  const handleSubmit = (event) => {
    event.preventDefault();
    onSave();
  };

  return (
    <section className="grid grid-cols-[minmax(280px,380px)_minmax(0,1fr)] gap-4.5 items-start max-[768px]:grid-cols-1">
      <form className="border border-[#ded8ca] rounded-lg bg-[#fffdfa] shadow-[0_10px_24px_rgba(52,45,35,0.07)] p-4.5 grid gap-3.5" onSubmit={handleSubmit}>
        <h3 className="m-0 text-brand-dark text-lg font-bold">{categoryForm.id ? 'Edit category' : 'Create category'}</h3>
        <label className="grid gap-1.75 text-[#5c544a] text-[13px] font-black">
          Name
          <input
            value={categoryForm.name}
            onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Smoothies"
            className="w-full min-h-[44px] px-3 border border-[#d9d0c1] rounded-lg bg-white text-brand-text text-[15px] font-semibold"
          />
        </label>
        <label className="grid gap-1.75 text-[#5c544a] text-[13px] font-black">
          Color
          <select
            value={categoryForm.tone}
            onChange={(event) => setCategoryForm((current) => ({ ...current, tone: event.target.value }))}
            className="w-full min-h-[44px] px-3 border border-[#d9d0c1] rounded-lg bg-white text-brand-text text-[15px] font-semibold"
          >
            {TONES.map((tone) => (
              <option key={tone} value={tone}>
                {tone}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2.5">
          <button className="flex-1 min-h-[48px] border rounded-lg font-black cursor-pointer border-[#24211f] bg-[#24211f] text-[#fff9ee]" type="submit">
            {categoryForm.id ? 'Save category' : 'Add category'}
          </button>
          {categoryForm.id ? (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 min-h-[48px] border border-[#d9d0c1] rounded-lg bg-white text-[#4f483f] font-black cursor-pointer"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="border border-[#ded8ca] rounded-lg bg-[#fffdfa] shadow-[0_10px_24px_rgba(52,45,35,0.07)] p-4.5 grid gap-2.5">
        <h3 className="m-0 text-brand-dark text-lg font-bold">Categories</h3>
        {categories.map((category) => (
          <div className="py-3.25 px-0 border-t border-[#eee7db] grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-center first-of-type:border-t-0" key={category.id}>
            <div>
              <strong className="block text-brand-text text-[15px] font-bold">{category.name}</strong>
              <span className="block mt-1 text-brand-subtext text-[13px] font-bold">{products.filter((product) => product.categoryId === category.id).length} items</span>
            </div>
            <div className="flex items-center gap-2 max-[768px]:justify-start max-[768px]:flex-wrap">
              <span className={`w-6.5 h-6.5 rounded-full border border-[rgba(34,31,31,0.12)] ${
                category.tone === 'gold' ? 'bg-[#f8d36b]' :
                category.tone === 'green' ? 'bg-[#79b991]' :
                category.tone === 'blue' ? 'bg-[#8cb8c5]' :
                category.tone === 'rose' ? 'bg-[#e6a48f]' : ''
              }`} />
              <button
                type="button"
                onClick={() => onEdit(category)}
                className="min-h-[34px] px-2.75 border border-[#d9d0c1] rounded-full bg-white text-[#4f483f] text-xs font-black cursor-pointer"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(category.id)}
                className="min-h-[34px] px-2.75 border border-[#d9d0c1] rounded-full bg-white text-[#4f483f] text-xs font-black cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
