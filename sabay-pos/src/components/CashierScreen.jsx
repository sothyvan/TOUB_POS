import { useMemo } from 'react';
import { money } from '../utils/format';

export default function CashierScreen({
  products,
  categories,
  categoryById,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  filteredProducts,
  cart,
  cartById,
  addToCart,
  updateQuantity,
  isCartOpen,
  setIsCartOpen,
  itemCount,
}) {
  return (
    <main className="workspace">
      <section className="catalog-panel" aria-label="Product catalog">
        <div className="catalog-toolbar">
          <div>
            <p className="eyebrow">Menu</p>
            <h2>Quick sale</h2>
          </div>

          <label className="search-box">
            <span>Search</span>
            <input
              type="search"
              placeholder="Item, code, category"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
        </div>

        <div className="category-tabs" role="tablist" aria-label="Product categories">
          <button
            className={selectedCategory === 'All' ? 'active' : ''}
            onClick={() => setSelectedCategory('All')}
            type="button"
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              className={selectedCategory === category.id ? 'active' : ''}
              onClick={() => setSelectedCategory(category.id)}
              type="button"
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="product-grid">
          {filteredProducts.map((product) => {
            const cartItem = cartById.get(product.id);
            const category = categoryById.get(product.categoryId);

            return (
              <article className={`product-tile ${product.tone}`} key={product.id}>
                <button
                  className="product-hit-area"
                  onClick={() => addToCart(product)}
                  type="button"
                >
                  <span className="product-code">{product.code}</span>
                  <span className="product-name">{product.name}</span>
                  <span className="product-category">{category?.name || 'Menu'}</span>
                </button>

                <div className="product-footer">
                  <strong>{money(product.price)}</strong>
                  {cartItem ? (
                    <div className="tile-quantity-controls" aria-label={`${product.name} quantity`}>
                      <button type="button" onClick={() => updateQuantity(product.id, -1)}>
                        -
                      </button>
                      <span>{cartItem.quantity}</span>
                      <button type="button" onClick={() => updateQuantity(product.id, 1)}>
                        +
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {isCartOpen ? (
        <button
          className="cart-backdrop"
          type="button"
          aria-label="Close cart"
          onClick={() => setIsCartOpen(false)}
        />
      ) : null}
    </main>
  );
}
