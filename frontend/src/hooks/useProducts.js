import { useMemo, useState, useEffect } from 'react';
import { suggestedCode } from '../utils/format';
import { api } from '../services/api';

export const blankProductForm = (categoryId = '') => ({
  id: null, name: '', code: '', price: '', categoryId, tone: 'gold', available: true, image: '', stallId: ''
});

const blankCategoryForm = () => ({ id: null, name: '', tone: 'gold', stallId: '' });

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

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        setLoading(true);
        const [loadedCats, loadedProds] = await Promise.all([
          api.categories.getAll(),
          api.products.getAll()
        ]);
        if (!ignore) {
          setCategories(loadedCats);
          setProducts(loadedProds);
          setProductForm(blankProductForm(loadedCats[0]?.id || ''));
        }
      } catch (err) {
        if (!ignore) setError(err.message || 'Failed to load products.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadData();
    return () => { ignore = true; };
  }, []);

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
    const name = categoryForm.name.trim();
    if (!canManageMenu || !name) return;
    if (categories.some((c) => c.id !== categoryForm.id && c.name.toLowerCase() === name.toLowerCase())) {
      alert('That category already exists.');
      return;
    }
    try {
      if (categoryForm.id) {
        await api.categories.save({ id: categoryForm.id, name, tone: categoryForm.tone, stallId: categoryForm.stallId });
      } else {
        const newCat = await api.categories.save({ name, tone: categoryForm.tone, stallId: categoryForm.stallId });
        setProductForm((cur) => ({ ...cur, categoryId: newCat.id, tone: newCat.tone }));
      }
      
      const [nextCats, nextProds] = await Promise.all([api.categories.getAll(), api.products.getAll()]);
      setCategories(nextCats);
      setProducts(nextProds);
      setCategoryForm(blankCategoryForm());
    } catch(err) {
      alert(err.message || 'Failed to save category.');
    }
  };

  const editCategory = (cat) => setCategoryForm(cat);

  const cancelCategoryEdit = () => {
    setCategoryForm(blankCategoryForm());
  };

  const deleteCategory = async (categoryId) => {
    if (!canManageMenu) return;
    if (products.some((p) => p.categoryId === categoryId)) {
      alert('Move or delete products in this category first.');
      return;
    }
    try {
      await api.categories.delete(categoryId);
      const nextCats = await api.categories.getAll();
      setCategories(nextCats);
      if (productForm.categoryId === categoryId) {
        setProductForm((prev) => ({
          ...prev,
          categoryId: nextCats[0]?.id || '',
          tone: nextCats[0]?.tone || 'gold',
        }));
      }
      if (selectedCategory === categoryId) setSelectedCategory('All');
    } catch(err) {
      alert(err.message || 'Failed to delete category.');
    }
  };

  // ── Product handlers ────────────────────────────────────────────────────
  const saveProduct = async (form = productForm) => {
    const name = form.name.trim();
    const price = Number(form.price);
    if (!canManageMenu || !name || !form.categoryId || !form.stallId || isNaN(price) || price <= 0) {
      alert('Add a name, stall, category, and valid price.');
      return null;
    }
    const product = {
      id: form.id,
      name,
      code: (form.code.trim() || suggestedCode(name)).toUpperCase(),
      price,
      categoryId: form.categoryId,
      stallId: form.stallId,
      tone: form.tone,
      available: form.available,
      image: form.image || '',
    };
    try {
      const saved = await api.products.save(product);
      setProducts(await api.products.getAll());
      setProductForm(blankProductForm(form.categoryId));
      return form.id ? saved.id : 'new'; 
    } catch(err) {
      alert(err.message || 'Failed to save product.');
      return null;
    }
  };

  const editProduct = (product) =>
    setProductForm({ ...product, price: String(product.price) });

  const cancelProductEdit = () => {
    setProductForm(blankProductForm(categories[0]?.id || ''));
  };

  const toggleProductAvailability = async (productId) => {
    if (!canManageMenu) return;
    const target = products.find((p) => p.id === productId);
    if (target) {
      try {
        await api.products.save({ ...target, available: !target.available });
        setProducts(await api.products.getAll());
      } catch(err) {
        alert(err.message || 'Failed to toggle availability.');
      }
    }
    return productId; // signal: remove from cart
  };

  const deleteProduct = async (productId) => {
    if (!canManageMenu) return;
    try {
      await api.products.delete(productId);
      setProducts(await api.products.getAll());
      return productId; // signal: remove from cart
    } catch(err) {
      alert(err.message || 'Failed to delete product.');
    }
  };

  return {
    categories, products, categoryById, filteredProducts,
    productForm, setProductForm,
    categoryForm, setCategoryForm,
    selectedCategory, setSelectedCategory,
    searchQuery, setSearchQuery,
    saveCategory, editCategory, deleteCategory, cancelCategoryEdit,
    saveProduct, editProduct, toggleProductAvailability, deleteProduct, cancelProductEdit,
    loading, error
  };
}

