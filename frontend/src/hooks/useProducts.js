import { useMemo, useState } from 'react';
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS } from '../data/seedData';
import { suggestedCode } from '../utils/format';
import { makeId } from '../utils/ids';
import { useSavedState } from './useSavedState';

export const blankProductForm = (categoryId = '') => ({
  id: null, name: '', code: '', price: '', categoryId, tone: 'gold', available: true,
});

const blankCategoryForm = () => ({ id: null, name: '', tone: 'gold' });

/**
 * Manages products and categories — state, filters, and CRUD.
 * NOTE: Handlers that must also remove items from the cart
 * (toggleProductAvailability, deleteProduct, saveProduct/edit)
 * are intentionally bare here. CashierPage wraps them to also
 * call removeItemFromCart, keeping this hook free of cart deps.
 *
 * @param {boolean} canManageMenu
 */
export function useProducts(canManageMenu) {
  const [categories, setCategories] = useSavedState('sabay-pos-categories', DEFAULT_CATEGORIES);
  const [products, setProducts] = useSavedState('sabay-pos-products', DEFAULT_PRODUCTS);
  const [productForm, setProductForm] = useState(() => blankProductForm(categories[0]?.id || ''));
  const [categoryForm, setCategoryForm] = useState(blankCategoryForm);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categoryById = useMemo(
    () => new Map(categories.map((cat) => [cat.id, cat])),
    [categories]
  );

  const visibleProducts = products.filter((p) => p.available);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return visibleProducts.filter((p) => {
      const cat = categoryById.get(p.categoryId);
      const inCategory = selectedCategory === 'All' || p.categoryId === selectedCategory;
      const inSearch =
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        cat?.name.toLowerCase().includes(q);
      return inCategory && inSearch;
    });
  }, [categoryById, searchQuery, selectedCategory, visibleProducts]);

  // ── Category handlers ───────────────────────────────────────────────────
  const saveCategory = () => {
    const name = categoryForm.name.trim();
    if (!canManageMenu || !name) return;
    if (categories.some((c) => c.id !== categoryForm.id && c.name.toLowerCase() === name.toLowerCase())) {
      alert('That category already exists.');
      return;
    }
    if (categoryForm.id) {
      setCategories((cur) =>
        cur.map((c) => (c.id === categoryForm.id ? { ...c, name, tone: categoryForm.tone } : c))
      );
      setProducts((cur) =>
        cur.map((p) => (p.categoryId === categoryForm.id ? { ...p, tone: categoryForm.tone } : p))
      );
    } else {
      const cat = { id: makeId('cat'), name, tone: categoryForm.tone };
      setCategories((cur) => [...cur, cat]);
      setProductForm((cur) => ({ ...cur, categoryId: cat.id, tone: cat.tone }));
    }
    setCategoryForm(blankCategoryForm());
  };

  const editCategory = (cat) => setCategoryForm(cat);

  const cancelCategoryEdit = () => {
    setCategoryForm(blankCategoryForm());
  };

  const deleteCategory = (categoryId) => {
    if (!canManageMenu) return;
    if (products.some((p) => p.categoryId === categoryId)) {
      alert('Move or delete products in this category first.');
      return;
    }
    const nextCats = categories.filter((c) => c.id !== categoryId);
    setCategories(nextCats);
    if (productForm.categoryId === categoryId) {
      setProductForm((prev) => ({
        ...prev,
        categoryId: nextCats[0]?.id || '',
        tone: nextCats[0]?.tone || 'gold',
      }));
    }
    if (selectedCategory === categoryId) setSelectedCategory('All');
  };

  // ── Product handlers ────────────────────────────────────────────────────
  /**
   * Returns the saved product id if it was an edit (so caller can sync cart),
   * or null if it was a new product.
   */
  const saveProduct = () => {
    const name = productForm.name.trim();
    const price = Number(productForm.price);
    if (!canManageMenu || !name || !productForm.categoryId || isNaN(price) || price <= 0) {
      alert('Add a name, category, and valid price.');
      return null;
    }
    const product = {
      id: productForm.id || makeId('prod'),
      name,
      code: (productForm.code.trim() || suggestedCode(name)).toUpperCase(),
      price,
      categoryId: productForm.categoryId,
      tone: productForm.tone,
      available: productForm.available,
    };
    if (productForm.id) {
      setProducts((cur) => cur.map((p) => (p.id === product.id ? product : p)));
      setProductForm(blankProductForm(productForm.categoryId));
      return product.id; // signal: remove this id from cart
    }
    setProducts((cur) => [...cur, product]);
    setProductForm(blankProductForm(productForm.categoryId));
    return null;
  };

  const editProduct = (product) =>
    setProductForm({ ...product, price: String(product.price) });

  const cancelProductEdit = () => {
    setProductForm(blankProductForm(categories[0]?.id || ''));
  };

  const toggleProductAvailability = (productId) => {
    if (!canManageMenu) return;
    setProducts((cur) =>
      cur.map((p) => (p.id === productId ? { ...p, available: !p.available } : p))
    );
    return productId; // signal: remove from cart
  };

  const deleteProduct = (productId) => {
    if (!canManageMenu) return;
    setProducts((cur) => cur.filter((p) => p.id !== productId));
    return productId; // signal: remove from cart
  };

  return {
    categories, products, categoryById, filteredProducts,
    productForm, setProductForm,
    categoryForm, setCategoryForm,
    selectedCategory, setSelectedCategory,
    searchQuery, setSearchQuery,
    saveCategory, editCategory, deleteCategory, cancelCategoryEdit,
    saveProduct, editProduct, toggleProductAvailability, deleteProduct, cancelProductEdit,
  };
}
