import { money } from '../utils/format';
import { suggestedCode } from '../utils/format';

const TONES = ['gold', 'green', 'blue', 'rose'];

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
}) {
  const handleSubmit = (event) => {
    event.preventDefault();
    onSave();
  };

  const blankProductForm = (categoryId) => ({
    id: null,
    name: '',
    code: '',
    price: '',
    categoryId,
    tone: 'gold',
    available: true,
  });

  return (
    <section className="admin-grid">
      <form className="admin-form" onSubmit={handleSubmit}>
        <h3>{productForm.id ? 'Edit item' : 'Create item'}</h3>
        <label>
          Name
          <input
            value={productForm.name}
            onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Brown sugar latte"
          />
        </label>
        <div className="form-row">
          <label>
            Code
            <input
              value={productForm.code}
              onChange={(event) => setProductForm((current) => ({ ...current, code: event.target.value }))}
              placeholder="BSL"
            />
          </label>
          <label>
            Price
            <input
              type="number"
              min="0"
              step="0.01"
              value={productForm.price}
              onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))}
              placeholder="1.50"
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Category
            <select
              value={productForm.categoryId}
              onChange={(event) => {
                const category = categoryById.get(event.target.value);
                setProductForm((current) => ({
                  ...current,
                  categoryId: event.target.value,
                  tone: category?.tone || current.tone,
                }));
              }}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Color
            <select
              value={productForm.tone}
              onChange={(event) => setProductForm((current) => ({ ...current, tone: event.target.value }))}
            >
              {TONES.map((tone) => (
                <option key={tone} value={tone}>
                  {tone}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="check-line">
          <input
            type="checkbox"
            checked={productForm.available}
            onChange={(event) =>
              setProductForm((current) => ({ ...current, available: event.target.checked }))
            }
          />
          Available for sale
        </label>
        <div className="form-actions">
          <button className="admin-primary" type="submit">
            {productForm.id ? 'Save item' : 'Add item'}
          </button>
          {productForm.id ? (
            <button type="button" onClick={() => setProductForm(blankProductForm(productForm.categoryId))}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="admin-list">
        <h3>Items</h3>
        {products.map((product) => (
          <div className="admin-row" key={product.id}>
            <div>
              <strong>{product.name}</strong>
              <span>
                {product.code} - {categoryById.get(product.categoryId)?.name || 'No category'} -{' '}
                {money(product.price)} - {product.available ? 'Visible' : 'Hidden'}
              </span>
            </div>
            <div className="row-actions">
              <button type="button" onClick={() => onEdit(product)}>
                Edit
              </button>
              <button type="button" onClick={() => onToggleAvailability(product.id)}>
                {product.available ? 'Hide' : 'Show'}
              </button>
              <button type="button" onClick={() => onDelete(product.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
