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
  const handleSubmit = (event) => {
    event.preventDefault();
    onSave();
  };

  return (
    <section className="grid grid-cols-[minmax(280px,380px)_minmax(0,1fr)] gap-4.5 items-start max-[768px]:grid-cols-1">
      <form className="border border-[#ded8ca] rounded-lg bg-[#fffdfa] shadow-[0_10px_24px_rgba(52,45,35,0.07)] p-4.5 grid gap-3.5" onSubmit={handleSubmit}>
        <h3 className="m-0 text-brand-dark text-lg font-bold">{productForm.id ? 'Edit item' : 'Create item'}</h3>
        <label className="grid gap-1.75 text-[#5c544a] text-[13px] font-black">
          Name
          <input
            value={productForm.name}
            onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Brown sugar latte"
            className="w-full min-h-[44px] px-3 border border-[#d9d0c1] rounded-lg bg-white text-brand-text text-[15px] font-semibold"
          />
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          <label className="grid gap-1.75 text-[#5c544a] text-[13px] font-black">
            Code
            <input
              value={productForm.code}
              onChange={(event) => setProductForm((current) => ({ ...current, code: event.target.value }))}
              placeholder="BSL"
              className="w-full min-h-[44px] px-3 border border-[#d9d0c1] rounded-lg bg-white text-brand-text text-[15px] font-semibold"
            />
          </label>
          <label className="grid gap-1.75 text-[#5c544a] text-[13px] font-black">
            Price
            <input
              type="number"
              min="0"
              step="0.01"
              value={productForm.price}
              onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))}
              placeholder="1.50"
              className="w-full min-h-[44px] px-3 border border-[#d9d0c1] rounded-lg bg-white text-brand-text text-[15px] font-semibold"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <label className="grid gap-1.75 text-[#5c544a] text-[13px] font-black">
            Category
            <select
              value={productForm.categoryId || ''}
              onChange={(event) => {
                const category = categoryById.get(event.target.value);
                setProductForm((current) => ({
                  ...current,
                  categoryId: event.target.value,
                  tone: category?.tone || current.tone,
                }));
              }}
              className="w-full min-h-[44px] px-3 border border-[#d9d0c1] rounded-lg bg-white text-brand-text text-[15px] font-semibold"
            >
              {categories.length === 0 ? (
                <option value="" disabled>No categories available - create one first</option>
              ) : (
                <>
                  <option value="" disabled>-- Select Category --</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </>
              )}
            </select>
          </label>
          <label className="grid gap-1.75 text-[#5c544a] text-[13px] font-black">
            Color
            <select
              value={productForm.tone}
              onChange={(event) => setProductForm((current) => ({ ...current, tone: event.target.value }))}
              className="w-full min-h-[44px] px-3 border border-[#d9d0c1] rounded-lg bg-white text-brand-text text-[15px] font-semibold"
            >
              {TONES.map((tone) => (
                <option key={tone} value={tone}>
                  {tone}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2.5 text-[#5c544a] text-[13px] font-black cursor-pointer">
          <input
            type="checkbox"
            checked={productForm.available}
            onChange={(event) =>
              setProductForm((current) => ({ ...current, available: event.target.checked }))
            }
            className="w-4.5 h-4.5 accent-brand-primary"
          />
          Available for sale
        </label>
        <div className="flex items-center gap-2.5">
          <button className="flex-1 min-h-[48px] border rounded-lg font-black cursor-pointer border-[#24211f] bg-[#24211f] text-[#fff9ee]" type="submit">
            {productForm.id ? 'Save item' : 'Add item'}
          </button>
          {productForm.id ? (
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
        <h3 className="m-0 text-brand-dark text-lg font-bold">Items</h3>
        {products.map((product) => (
          <div className="py-3.25 px-0 border-t border-[#eee7db] grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-center first-of-type:border-t-0" key={product.id}>
            <div>
              <strong className="block text-brand-text text-[15px] font-bold">{product.name}</strong>
              <span className="block mt-1 text-brand-subtext text-[13px] font-bold">
                {product.code} - {categoryById.get(product.categoryId)?.name || 'No category'} -{' '}
                {money(product.price)} - {product.available ? 'Visible' : 'Hidden'}
              </span>
            </div>
            <div className="flex items-center gap-2 max-[768px]:justify-start max-[768px]:flex-wrap">
              <button
                type="button"
                onClick={() => onEdit(product)}
                className="min-h-[34px] px-2.75 border border-[#d9d0c1] rounded-full bg-white text-[#4f483f] text-xs font-black cursor-pointer"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onToggleAvailability(product.id)}
                className="min-h-[34px] px-2.75 border border-[#d9d0c1] rounded-full bg-white text-[#4f483f] text-xs font-black cursor-pointer"
              >
                {product.available ? 'Hide' : 'Show'}
              </button>
              <button
                type="button"
                onClick={() => onDelete(product.id)}
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
