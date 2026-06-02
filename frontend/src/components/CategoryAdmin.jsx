const TONES = ['gold', 'green', 'blue', 'rose'];

export default function CategoryAdmin({
  categoryForm,
  setCategoryForm,
  categories,
  products,
  onSave,
  onEdit,
  onDelete,
}) {
  const handleSubmit = (event) => {
    event.preventDefault();
    onSave();
  };

  return (
    <section className="admin-grid">
      <form className="admin-form" onSubmit={handleSubmit}>
        <h3>{categoryForm.id ? 'Edit category' : 'Create category'}</h3>
        <label>
          Name
          <input
            value={categoryForm.name}
            onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Smoothies"
          />
        </label>
        <label>
          Color
          <select
            value={categoryForm.tone}
            onChange={(event) => setCategoryForm((current) => ({ ...current, tone: event.target.value }))}
          >
            {TONES.map((tone) => (
              <option key={tone} value={tone}>
                {tone}
              </option>
            ))}
          </select>
        </label>
        <div className="form-actions">
          <button className="admin-primary" type="submit">
            {categoryForm.id ? 'Save category' : 'Add category'}
          </button>
          {categoryForm.id ? (
            <button type="button" onClick={() => setCategoryForm({ id: null, name: '', tone: 'gold' })}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="admin-list">
        <h3>Categories</h3>
        {categories.map((category) => (
          <div className="admin-row" key={category.id}>
            <div>
              <strong>{category.name}</strong>
              <span>{products.filter((product) => product.categoryId === category.id).length} items</span>
            </div>
            <div className="row-actions">
              <span className={`tone-swatch ${category.tone}`} />
              <button type="button" onClick={() => onEdit(category)}>
                Edit
              </button>
              <button type="button" onClick={() => onDelete(category.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
