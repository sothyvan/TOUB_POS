import { useMemo, useState, useEffect, useCallback } from 'react';
import { suggestedCode } from '../utils/format';
import { api } from '../services/api';
import { useAutoRefresh } from './useAutoRefresh';

export const blankProductForm = (categoryId = '') => ({
  id: null, name: '', code: '', price: '', priceKhr: '', categoryId, tone: 'gold', available: true, image: '', stallId: '', stallIds: []
});

const blankCategoryForm = () => ({ id: null, name: '', tone: 'gold' });

const hasProductDraft = (form) => Boolean(
  form.id
  || form.name
  || form.code
  || form.price
  || form.priceKhr
  || form.categoryId
  || form.image
  || form.stallId
  || (form.stallIds || []).length
);

// api.products.getAll/categories.getAll return { data, pagination } when called
// with pagination params, or a bare array otherwise. Normalize to an array so the
// catalog can load (and then paginate) the full list client-side.
function normalizeList(result) {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.data)) return result.data;
  return [];
}

const FULL_LIST = { limit: 1000 };

/**
 * Manages products and categories — state, filters, and CRUD using backend APIs.
 *
 * @param {boolean} canManageMenu
 */
export function useProducts(canManageMenu) {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [productForm, setProductForm] = useState(blankProductForm());
  const [categoryForm, setCategoryForm] = useState(blankCategoryForm());
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const loadData = useCallback(async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      const [loadedCats, loadedProds] = await Promise.all([
        api.categories.getAll(FULL_LIST),
        api.products.getAll(FULL_LIST)
      ]);
      setCategories(normalizeList(loadedCats));
      setProducts(normalizeList(loadedProds));
      setProductForm((current) => (
        hasProductDraft(current)
          ? current
          : blankProductForm(loadedCats[0]?.id || '')
      ));
      setError(null);
      return { categories: loadedCats, products: loadedProds };
    } catch (err) {
      setError(err.message || 'Failed to load products.');
      return null;
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadData(true);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadData]);

  useAutoRefresh(() => loadData(false), {
    enabled: true,
    intervalMs: canManageMenu ? 30000 : 20000,
  });

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
        cat?.name?.toLowerCase().includes(q);
      return inCategory && inSearch;
    });
  }, [categoryById, searchQuery, selectedCategory, visibleProducts]);

  // ── Category handlers ───────────────────────────────────────────────────
  const saveCategory = async () => {
    setActionError(null);
    const name = categoryForm.name.trim();
    if (!canManageMenu || !name) return;
    if (categories.some((c) => c.id !== categoryForm.id && c.name.toLowerCase() === name.toLowerCase())) {
      setActionError('That category already exists.');
      return;
    }
    try {
      if (categoryForm.id) {
        await api.categories.save({ id: categoryForm.id, name, tone: categoryForm.tone });
      } else {
        const newCat = await api.categories.save({ name, tone: categoryForm.tone });
        setProductForm((cur) => ({ ...cur, categoryId: newCat.id, tone: newCat.tone }));
      }
      
      await loadData(false);
      setCategoryForm(blankCategoryForm());
    } catch(err) {
      setActionError(err.message || 'Failed to save category.');
    }
  };

  const editCategory = (cat) => setCategoryForm(cat);

  const cancelCategoryEdit = () => {
    setCategoryForm(blankCategoryForm());
  };

  const deleteCategory = async (categoryId) => {
    setActionError(null);
    if (!canManageMenu) return false;
    if (products.some((p) => p.categoryId === categoryId)) {
      const msg = 'Move or delete products in this category first.';
      setActionError(msg);
      throw new Error(msg);
    }
    try {
      await api.categories.delete(categoryId);
      const nextCats = await api.categories.getAll(FULL_LIST);
      setCategories(normalizeList(nextCats));
      setProducts(normalizeList(await api.products.getAll(FULL_LIST)));
      if (productForm.categoryId === categoryId) {
        setProductForm((prev) => ({
          ...prev,
          categoryId: nextCats[0]?.id || '',
          tone: nextCats[0]?.tone || 'gold',
        }));
      }
      if (selectedCategory === categoryId) setSelectedCategory('All');
      return true;
    } catch(err) {
      setActionError(err.message || 'Failed to delete category.');
      throw err;
    }
  };

  // ── Product handlers ────────────────────────────────────────────────────
  const saveProduct = async (form = productForm) => {
    setActionError(null);
    const name = form.name.trim();
    const price = Number(form.price);
    const priceKhr = Number(form.priceKhr);
    if (!canManageMenu || !name || !form.categoryId) {
      setActionError('Add a product name and category.');
      return null;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setActionError(
        (form.stallIds || []).length > 0
          ? 'Enter a valid positive price before assigning this product to a stall.'
          : 'Enter a valid positive default price for this product.'
      );
      return null;
    }
    if (!Number.isSafeInteger(priceKhr) || priceKhr <= 0) {
      setActionError('Enter a valid positive whole-riel KHR price.');
      return null;
    }
    const product = {
      id: form.id,
      name,
      code: (form.code.trim() || suggestedCode(name)).toUpperCase(),
      price,
      priceKhr,
      categoryId: form.categoryId,
      stallId: form.stallId,
      stallIds: form.stallIds || [],
      tone: form.tone,
      available: form.available,
      image: form.image || '',
    };
    try {
      const saved = await api.products.save(product);
      await loadData(false);
      setProductForm(blankProductForm(form.categoryId));
      return form.id ? saved.id : 'new'; 
    } catch(err) {
      setActionError(err.message || 'Failed to save product.');
      return null;
    }
  };

  const editProduct = (product) =>
    setProductForm({ ...product, price: String(product.price), priceKhr: String(product.priceKhr) });

  const cancelProductEdit = () => {
    setProductForm(blankProductForm(categories[0]?.id || ''));
  };

  const toggleProductAvailability = async (productId) => {
    setActionError(null);
    if (!canManageMenu) return;
    const target = products.find((p) => p.id === productId);
    if (target) {
      try {
        await api.products.save({ ...target, available: !target.available });
        await loadData(false);
      } catch(err) {
        setActionError(err.message || 'Failed to toggle availability.');
      }
    }
    return productId; // signal: remove from cart
  };

  const deleteProduct = async (productId) => {
    setActionError(null);
    if (!canManageMenu) return false;
    try {
      await api.products.delete(productId);
      await loadData(false);
      return true;
    } catch(err) {
      setActionError(err.message || 'Failed to delete product.');
      throw err;
    }
  };

  const moveProductsToCategory = async (productIds, categoryId) => {
    setActionError(null);
    const normalizedIds = [...new Set(productIds.map(Number).filter(Number.isInteger))];
    const normalizedCategoryId = Number(categoryId);

    if (!canManageMenu || normalizedIds.length === 0) return false;
    if (!categories.some((category) => Number(category.id) === normalizedCategoryId)) {
      setActionError('Choose a valid destination category.');
      return false;
    }

    try {
      await Promise.all(
        normalizedIds.map((productId) => api.products.moveToCategory(productId, normalizedCategoryId))
      );
      await loadData(false);
      return true;
    } catch (err) {
      await loadData(false);
      setActionError(err.message || 'Failed to move products to the selected category.');
      return false;
    }
  };

  return {
    categories, products, categoryById, filteredProducts,
    productForm, setProductForm,
    categoryForm, setCategoryForm,
    selectedCategory, setSelectedCategory,
    searchQuery, setSearchQuery,
    saveCategory, editCategory, deleteCategory, cancelCategoryEdit,
    saveProduct, editProduct, toggleProductAvailability, deleteProduct, moveProductsToCategory, cancelProductEdit,
    loading, error, actionError,
    clearActionError: () => setActionError(null),
  };
}

