import { useEffect, useState, useMemo, useRef } from 'react';
import Icon from './ui/Icon';
import CategoryOwner from './CategoryOwner';
import { money } from '../utils/format';
import FormInput from './ui/FormInput';
import FormSelect from './ui/FormSelect';
import StatusBadge from './ui/StatusBadge';
import TabPills from './ui/TabPills';
import { api } from '../services/api';

// KHR exchange rate (approx)
const KHR_RATE = 4000;
const PRODUCT_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';

function toKHR(usd) {
  return Math.round(parseFloat(usd || 0) * KHR_RATE).toLocaleString();
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="cursor-pointer border-0 p-0 transition-all duration-200 active:scale-95 shrink-0"
      style={{
        width: 38, height: 22, borderRadius: 999,
        background: checked ? '#22c55e' : '#d1d5db',
        position: 'relative',
      }}
    >
      <span style={{
        position: 'absolute', top: 2,
        left: checked ? 18 : 2,
        width: 18, height: 18,
        borderRadius: '50%',
        background: '#ffffff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'left 0.2s',
      }} />
    </button>
  );
}

function ProductRow({ product, categories, stalls, isSelected, onEdit, onDelete }) {
  const category = categories.find(c => c.id === product.categoryId);
  const [showMenu, setShowMenu] = useState(false);
  const [imgError, setImgError] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    setImgError(false);
  }, [product.image]);

  useEffect(() => {
    if (!showMenu) return;
    
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showMenu]);

  return (
    <div
      className={`relative flex flex-col md:flex-row md:items-center gap-0 md:gap-4 cursor-pointer transition-all duration-200 rounded-2xl md:rounded-none border border-gray-200 md:border-0 md:border-b md:border-b-gray-50 bg-white md:bg-transparent overflow-hidden ${isSelected ? 'md:bg-indigo-50/50 border-indigo-200 shadow-sm ring-2 ring-indigo-500/20' : 'hover:shadow-lg md:hover:shadow-none hover:-translate-y-0.5 md:hover:translate-y-0 shadow-sm md:shadow-none'}`}
      style={{
        padding: '0', // Mobile relies on internal padding, desktop uses custom md: padding class
        background: isSelected ? '#f5f3ff' : undefined,
      }}
      onClick={() => onEdit(product)}
    >
      <div className="md:hidden absolute top-3 left-3 z-10">
        <StatusBadge active={product.available} activeLabel="In Stock" inactiveLabel="Out of Stock" className="shadow-sm" />
      </div>

      <div className="md:hidden flex items-center justify-center absolute top-3 right-3 z-10" ref={menuRef}>
        <button 
          type="button" 
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          className="w-8 h-8 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center text-gray-700 hover:bg-white active:scale-95 transition-all border border-gray-100 cursor-pointer"
        >
           <Icon name="moreVertical" className="w-4 h-4 text-gray-600" />
        </button>
        {showMenu && (
          <div className="absolute top-10 right-0 w-36 bg-white rounded-xl shadow-xl border border-gray-100 p-1 flex flex-col gap-1">
             <button type="button" onClick={(e) => { e.stopPropagation(); setShowMenu(false); onEdit(product); }} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50 text-left border-0 bg-transparent cursor-pointer">
               <Icon name="edit" className="w-3.5 h-3.5 text-blue-600" strokeWidth={2} />
               <span className="text-sm font-medium text-blue-600">Edit</span>
             </button>
             <button type="button" onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(product.id); }} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 text-left border-0 bg-transparent cursor-pointer">
               <Icon name="delete" className="w-3.5 h-3.5 text-red-600" strokeWidth={2} />
               <span className="text-sm font-medium text-red-600">Delete</span>
             </button>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-0 md:gap-4 w-full h-full md:px-5 md:py-3">
        {/* Thumbnail */}
        <div className="w-full aspect-[4/3] md:aspect-auto md:w-[40px] md:h-10 shrink-0 md:rounded-[9px] overflow-hidden border-b border-gray-100 md:border md:border-gray-100 bg-gray-50">
          {product.image && !imgError
            ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" onError={() => setImgError(true)} />
            : <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-400">
                <Icon name="product" className="w-6 h-6 md:hidden" strokeWidth={1.5} />
                <span className="text-[11px] md:text-[9px] font-bold tracking-widest md:tracking-normal">IMG</span>
              </div>
          }
        </div>

        {/* Info Area */}
        <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-4 p-3.5 md:p-0 flex-1 min-w-0 bg-white">
          {/* Name */}
          <div className="flex-1 min-w-[200px]">
            <p className="truncate" style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111827', fontFamily: 'Inter, sans-serif' }}>
              {product.name}
            </p>
            {stalls && stalls.length > 0 && (
              <p className="truncate" style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280', fontFamily: 'Inter, sans-serif' }}>
                {product.stallIds && product.stallIds.length > 0
                  ? stalls.filter(s => product.stallIds.includes(s.id)).map(s => s.name).join(', ')
                  : 'No stalls'}
              </p>
            )}
          </div>

          {/* Category */}
          <div className="hidden md:block w-[90px] shrink-0">
            <span style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', fontFamily: 'Inter, sans-serif' }}>
              {category?.name ?? '—'}
            </span>
          </div>

          {/* Price USD + KHR */}
          <div className="w-[110px] shrink-0 flex items-center justify-between md:block">
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827', fontFamily: 'Inter, sans-serif' }}>
              {money(product.price)}
            </p>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: '#9ca3af', fontFamily: 'Inter, sans-serif' }}>
              {toKHR(product.price)}៛
            </p>
          </div>

          {/* Status badge */}
          <div className="hidden md:block w-[90px] shrink-0">
            <StatusBadge active={product.available} activeLabel="In Stock" inactiveLabel="Out of Stock" />
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-1 w-[80px] shrink-0" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => onEdit(product)}
              className="flex items-center gap-1 cursor-pointer border-0 bg-transparent hover:opacity-70 transition-all px-1 py-0.5">
              <Icon name="edit" className="w-3 h-3" style={{ color: '#003ec7' }} strokeWidth={2} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#003ec7', fontFamily: 'Inter, sans-serif' }}>Edit</span>
            </button>
            <span style={{ color: '#e5e7eb', fontSize: 16, lineHeight: 1, userSelect: 'none' }}>|</span>
            <button type="button" onClick={() => onDelete(product.id)}
              className="flex items-center gap-1 cursor-pointer border-0 bg-transparent hover:opacity-70 transition-all px-1 py-0.5">
              <Icon name="delete" className="w-3 h-3" style={{ color: '#ef4444' }} strokeWidth={2} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', fontFamily: 'Inter, sans-serif' }}>Del</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Editor panel ──────────────────────────────────────────────────────────────
function EditorPanel({ form, setForm, categories, stalls, stallsLoading, stallsError, onSave, onCancel, isNew }) {
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    onSave(form);
  };

  const handleImageUpload = async (file) => {
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadError('');
      setUploadProgress(0);
      const response = await api.products.uploadImage(file, (event) => {
        if (!event.lengthComputable) return;
        setUploadProgress(Math.round((event.loaded / event.total) * 100));
      }, form.name);

      setForm(f => ({ ...f, image: response.url || '' }));
      setUploadProgress(100);
    } catch (err) {
      setUploadError(err.message || 'Failed to upload image.');
      setUploadProgress(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    handleImageUpload(event.dataTransfer.files?.[0]);
  };

  return (
    <div className="flex flex-col bg-white rounded-2xl overflow-hidden h-full border border-[#e5e7eb] shadow-2xl md:shadow-none w-full md:min-w-[340px] md:max-w-[465px]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#f3f4f6]" style={{ minHeight: 80 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827', fontFamily: 'Inter, sans-serif' }}>
            Product Details Editor
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af', fontFamily: 'Inter, sans-serif' }}>
            {isNew ? 'Creating new product' : `Editing: ${form.name || '—'}`}
          </p>
        </div>
        <button type="button" onClick={onCancel}
          className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-100 border-0"
          style={{ background: '#fafafa' }}>
          <Icon name="close" className="w-3.5 h-3.5 text-[#6b7280]" strokeWidth={2} />
        </button>
      </div>

      {/* Scrollable body */}
      <form onSubmit={handleSave} className="flex-1 overflow-y-auto flex flex-col">
        <div className="flex flex-col gap-4.5 p-5">

          {/* Product Photo */}
          <div className="grid gap-1.5">
            <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', fontFamily: 'Inter, sans-serif' }}>Product Photo</span>
            <div
              className="rounded-xl overflow-hidden border border-[#e5e7eb]"
              style={{ height: 180, background: '#fafafa' }}
              onDragOver={event => event.preventDefault()}
              onDrop={handleDrop}
            >
              {form.image
                ? <img src={form.image} alt="preview" className="w-full h-full object-cover" />
                : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#9ca3af]">
                    <Icon name="product" className="w-8 h-8" strokeWidth={1.5} />
                    <span style={{ fontSize: 12, fontFamily: 'Inter, sans-serif' }}>No photo - upload or paste URL below</span>
                  </div>
                )
              }
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex items-center justify-center gap-2 rounded-[10px] border border-[#dbe3f0] bg-white px-3 py-2 text-[12px] font-bold transition-all ${
                  isUploading ? 'cursor-wait text-[#6b7280]' : 'cursor-pointer text-[#003ec7] hover:bg-[#f8fbff]'
                }`}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <Icon name={isUploading ? 'clock' : 'product'} className="w-3.5 h-3.5" strokeWidth={2} />
                {isUploading ? 'Uploading...' : 'Upload Photo'}
                <input
                  type="file"
                  accept={PRODUCT_IMAGE_ACCEPT}
                  disabled={isUploading}
                  className="sr-only"
                  onChange={event => {
                    handleImageUpload(event.target.files?.[0]);
                    event.target.value = '';
                  }}
                />
              </label>
              <button
                type="button"
                disabled={!form.image || isUploading}
                onClick={() => {
                  setForm(f => ({ ...f, image: '' }));
                  setUploadError('');
                  setUploadProgress(null);
                }}
                className="rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2 text-[12px] font-bold text-[#6b7280] transition-all disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-50"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Clear Photo
              </button>
            </div>
            {uploadProgress !== null && (
              <div className="grid gap-1">
                <div className="h-2 overflow-hidden rounded-full bg-[#e5e7eb]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${uploadProgress}%`, background: '#003ec7' }}
                  />
                </div>
                <span style={{ fontSize: 11, color: '#6b7280', fontFamily: 'Inter, sans-serif' }}>
                  {uploadProgress}% uploaded
                </span>
              </div>
            )}
            {uploadError && (
              <p style={{ margin: 0, fontSize: 12, color: '#ef4444', fontFamily: 'Inter, sans-serif' }}>
                {uploadError}
              </p>
            )}
            <FormInput
              value={form.image || ''}
              onChange={e => {
                setUploadError('');
                setUploadProgress(null);
                setForm(f => ({ ...f, image: e.target.value }));
              }}
              placeholder="https://... or /images/photo.png"
            />
          </div>

          {/* Product Name */}
          <FormInput
            label="Product Name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Butter Croissant"
            required
          />

          <div className="grid gap-2">
            <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', fontFamily: 'Inter, sans-serif' }}>
              Assigned Stalls
            </span>
            {stallsLoading ? (
              <p className="text-xs text-gray-500 animate-pulse">Loading stalls...</p>
            ) : stallsError ? (
              <p style={{ margin: 0, fontSize: 12, color: '#ef4444', fontFamily: 'Inter, sans-serif' }}>{stallsError}</p>
            ) : stalls.length === 0 ? (
              <p className="text-xs text-gray-500">No stalls created yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {stalls.map(stall => {
                  const isSelected = (form.stallIds || []).includes(stall.id);
                  return (
                    <button
                      key={stall.id}
                      type="button"
                      onClick={() => {
                        setForm(f => {
                          const currentIds = f.stallIds || [];
                          const updatedIds = isSelected
                            ? currentIds.filter(id => id !== stall.id)
                            : [...currentIds, stall.id];
                          return { ...f, stallIds: updatedIds };
                        });
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[13px] font-semibold transition-all cursor-pointer active:scale-95"
                      style={{
                        backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                        borderColor: isSelected ? '#3b82f6' : '#e5e7eb',
                        color: isSelected ? '#1d4ed8' : '#374151',
                      }}
                    >
                      <span className={`w-3.5 h-3.5 rounded-md flex items-center justify-center border transition-all ${
                        isSelected ? 'bg-[#3b82f6] border-[#3b82f6] text-white' : 'border-[#d1d5db] bg-white'
                      }`}>
                        {isSelected && (
                          <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20">
                            <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                          </svg>
                        )}
                      </span>
                      <span>{stall.name}{stall.location ? ` (${stall.location})` : ''}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', fontFamily: 'Inter, sans-serif' }}>
              Assign this product to zero, one, or multiple stalls.
            </p>
          </div>

          {/* Menu Category */}
          <FormSelect
            label="Menu Category"
            value={form.categoryId || ''}
            onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
            required
          >
            <option value="" disabled>— Select category —</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </FormSelect>

          {/* Price USD + KHR */}
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Price (USD)"
              type="number" min="0" step="0.01"
              value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              placeholder="2.00"
              required
            />
            <FormInput
              label="Price (KHR)"
              type="number" min="0" step="1"
              value={form.price === '' || isNaN(parseFloat(form.price)) ? '' : Math.round(parseFloat(form.price) * KHR_RATE)}
              onChange={e => {
                const val = e.target.value;
                if (val === '') {
                  setForm(f => ({ ...f, price: '' }));
                } else {
                  const usd = parseFloat(val) / KHR_RATE;
                  setForm(f => ({ ...f, price: usd.toString() }));
                }
              }}
              placeholder="8000"
              required
            />
          </div>

          {/* Availability */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#374151', fontFamily: 'Inter, sans-serif' }}>Available for sale</p>
              <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', fontFamily: 'Inter, sans-serif' }}>Visible to cashiers</p>
            </div>
            <Toggle checked={form.available} onChange={v => setForm(f => ({ ...f, available: v }))} />
          </div>
        </div>

        {/* Sticky footer */}
        <div className="flex gap-2.5 px-5 py-4 border-t border-[#f3f4f6] mt-auto" style={{ background: '#fafafa' }}>
          <button type="button" onClick={onCancel}
            className="flex-1 rounded-[10px] border border-[#e5e7eb] cursor-pointer hover:bg-gray-50 transition-all font-bold"
            style={{ height: 42, fontSize: 13, color: '#6b7280', fontFamily: 'Inter, sans-serif', background: '#ffffff' }}>
            Cancel Changes
          </button>
          <button type="submit"
            className="flex-[2] rounded-[10px] border-0 cursor-pointer hover:opacity-90 transition-all font-bold"
            style={{ height: 42, fontSize: 13, color: '#ffffff', background: '#003ec7', fontFamily: 'Inter, sans-serif' }}>
            Save &amp; Publish Product
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Empty form factory ────────────────────────────────────────────────────────
function emptyForm() {
  return { id: null, name: '', image: '', price: '', categoryId: '', stallId: '', stallIds: [], tone: 'gold', available: true, code: '' };
}

// ── Main MenuCatalog ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'products',   label: 'Products'   },
  { id: 'categories', label: 'Categories' },
];

export default function MenuCatalog({
  products,
  setProductForm,
  onSaveProduct,
  onEditProduct,
  onToggleProductAvailability,
  onDeleteProduct,
  onCancelProduct,
  categories,
  categoryForm,
  setCategoryForm,
  onSaveCategory,
  onEditCategory,
  onDeleteCategory,
  onCancelCategory,
  loading,
  error,
}) {
  const [subTab, setSubTab]         = useState('products');
  const [search, setSearch]         = useState('');
  const [editingProduct, setEditing] = useState(null); // null = no panel, object = form data
  const [stalls, setStalls] = useState([]);
  const [stallsLoading, setStallsLoading] = useState(true);
  const [stallsError, setStallsError] = useState('');

  // Filtering states
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stallFilter, setStallFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    let ignore = false;
    async function loadStalls() {
      try {
        setStallsLoading(true);
        const data = await api.stalls.getAll();
        if (!ignore) setStalls(data);
      } catch (err) {
        if (!ignore) setStallsError(err.message || 'Failed to load stalls.');
      } finally {
        if (!ignore) setStallsLoading(false);
      }
    }
    loadStalls();
    return () => { ignore = true; };
  }, []);

  const filtered = useMemo(() => {
    return products.filter(p => {
      // 1. Text search
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      
      // 2. Category filter
      const matchesCategory = !categoryFilter || p.categoryId === Number(categoryFilter) || p.categoryId === categoryFilter;
      
      // 3. Stall filter
      const matchesStall = !stallFilter || (p.stallIds || []).includes(Number(stallFilter));
      
      // 4. Status filter
      const matchesStatus = !statusFilter || 
        (statusFilter === 'available' ? p.available : !p.available);
        
      return matchesSearch && matchesCategory && matchesStall && matchesStatus;
    });
  }, [products, search, categoryFilter, stallFilter, statusFilter]);

  const openEditor = (product) => {
    setEditing({
      ...product,
      stallIds: product.stallIds || (product.stallId ? [Number(product.stallId)] : [])
    });
    onEditProduct(product);
  };

  const openNew = () => {
    const blank = emptyForm();
    setEditing(blank);
    setProductForm(blank);
  };

  const handleSave = (formData) => {
    setProductForm(formData);
    onSaveProduct(formData);
    setEditing(null);
  };

  const handleCancel = () => {
    setEditing(null);
    onCancelProduct();
  };

  const handleDelete = (id) => {
    onDeleteProduct(id);
    if (editingProduct?.id === id) setEditing(null);
  };

  // ── Categories sub-tab ────────────────────────────────────────────────────
  if (subTab === 'categories') {
    return (
      <div className="flex flex-col gap-4">
        {/* Tab pills */}
        <TabPills tabs={TABS} activeId={subTab} onChange={setSubTab} className="w-fit" />
        <CategoryOwner
          categoryForm={categoryForm}
          setCategoryForm={setCategoryForm}
          categories={categories}
          products={products}
          onSave={onSaveCategory}
          onEdit={onEditCategory}
          onDelete={onDeleteCategory}
          onCancel={onCancelCategory}
          loading={loading}
          error={error}
        />
      </div>
    );
  }

  // ── Products tab (Figma layout) ───────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      {/* Tab pills + Search bar + Add button */}
      <div className="flex items-center gap-3 shrink-0">
        <TabPills tabs={TABS} activeId={subTab} onChange={setSubTab} className="w-fit" />

        {/* Search */}
        <div className="flex-1 relative">
          <Icon name="search" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" strokeWidth={2} />
          <input
            type="text" placeholder="Search products..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full border border-[#e5e7eb] outline-none rounded-[11px]"
            style={{
              height: 42, paddingLeft: 38, paddingRight: 14,
              fontSize: 14, fontFamily: 'Inter, sans-serif', color: '#374151',
              background: '#ffffff',
            }}
          />
        </div>

        {/* Add New Product */}
        <button type="button" onClick={openNew}
          className="flex items-center gap-2 rounded-[11px] border-0 cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all shrink-0"
          style={{ height: 42, padding: '0 20px', background: '#003ec7' }}>
          <Icon name="plus" className="w-4 h-4 text-white" strokeWidth={2.5} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#ffffff', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
            Add New Product
          </span>
        </button>
      </div>

      {/* 2-col layout */}
      <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Left — product list */}
        <div className="flex flex-col bg-white rounded-2xl overflow-hidden flex-1 min-w-0 border border-[#e5e7eb]">
          {/* Panel header */}
          <div className="px-5 py-4 border-b border-[#f3f4f6] flex items-center justify-between gap-4 flex-wrap" style={{ minHeight: 80 }}>
            <div>
              <div className="flex items-center gap-3">
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827', fontFamily: 'Inter, sans-serif' }}>
                  Menu Items
                </h3>
                {loading && <span className="text-xs text-[#6b7280] animate-pulse">Loading...</span>}
                {error && <span className="text-xs text-[#ef4444]">{error}</span>}
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af', fontFamily: 'Inter, sans-serif' }}>
                {filtered.length} product{filtered.length !== 1 ? 's' : ''} · click a row to edit
              </p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 bg-white h-8 px-2 cursor-pointer focus:border-[#003ec7] outline-none"
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={stallFilter}
                onChange={e => setStallFilter(e.target.value)}
                className="border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 bg-white h-8 px-2 cursor-pointer focus:border-[#003ec7] outline-none"
              >
                <option value="">All Stalls</option>
                {stalls.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 bg-white h-8 px-2 cursor-pointer focus:border-[#003ec7] outline-none"
              >
                <option value="">All Statuses</option>
                <option value="available">In Stock</option>
                <option value="unavailable">Out of Stock</option>
              </select>
            </div>
          </div>

          {/* Column headers */}
          <div className="hidden md:flex items-center gap-4 px-5 py-2 border-b border-[#f3f4f6] bg-[#fafafa]">
            <span className="w-[40px] shrink-0 text-[11px] font-bold text-gray-400 uppercase tracking-wider font-sans">Photo</span>
            <span className="flex-1 min-w-[200px] text-[11px] font-bold text-gray-400 uppercase tracking-wider font-sans">Name</span>
            <span className="w-[90px] shrink-0 text-[11px] font-bold text-gray-400 uppercase tracking-wider font-sans">Category</span>
            <span className="w-[110px] shrink-0 text-[11px] font-bold text-gray-400 uppercase tracking-wider font-sans">Price</span>
            <span className="w-[90px] shrink-0 text-[11px] font-bold text-gray-400 uppercase tracking-wider font-sans">Status</span>
            <span className="w-[80px] shrink-0 text-[11px] font-bold text-gray-400 uppercase tracking-wider font-sans">Actions</span>
          </div>

          {/* Rows */}
          <div className="flex-1 overflow-y-auto p-4 md:p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-[#9ca3af]">
                <span style={{ fontSize: 13, fontFamily: 'Inter, sans-serif' }} className="animate-pulse">Loading products...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-[#9ca3af]">
                <Icon name="product" className="w-8 h-8" strokeWidth={1.5} />
                <span style={{ fontSize: 13, fontFamily: 'Inter, sans-serif' }}>No products found</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-col gap-4 md:gap-0">
                {filtered.map(product => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    categories={categories}
                    stalls={stalls}
                    isSelected={editingProduct?.id === product.id}
                    onEdit={openEditor}
                    onDelete={handleDelete}
                    onToggle={onToggleProductAvailability}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right — editor panel (shown when editing) */}
        {editingProduct !== null && (
          <>
            <div className="md:hidden fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm" onClick={handleCancel} />
            <div className="fixed md:static inset-x-4 top-16 bottom-4 md:inset-auto z-50 md:z-auto">
              <EditorPanel
                form={editingProduct}
                setForm={setEditing}
                categories={categories}
                stalls={stalls}
                stallsLoading={stallsLoading}
                stallsError={stallsError}
                onSave={handleSave}
                onCancel={handleCancel}
                isNew={!editingProduct.id}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
