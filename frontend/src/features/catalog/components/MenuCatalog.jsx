import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import Icon from '../../../components/ui/Icon';
import CategoryOwner from './CategoryOwner';
import { money } from '../../../utils/format';
import FormInput from '../../../components/ui/FormInput';
import FormSelect from '../../../components/ui/FormSelect';
import StatusBadge from '../../../components/ui/StatusBadge';
import TabPills from '../../../components/ui/TabPills';
import Pagination from '../../../components/ui/Pagination';
import Switch from '../../../components/ui/Switch';
import Alert from '../../../components/ui/Alert';
import { api } from '../../../services/api';
import { useAutoRefresh } from '../../../hooks/useAutoRefresh';

// KHR exchange rate (approx)
const KHR_RATE = 4000;
const PRODUCT_PAGE_SIZE = 10;
const PRODUCT_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';

function toKHR(usd) {
  return Math.round(parseFloat(usd || 0) * KHR_RATE).toLocaleString();
}

function ProductRow({ product, categories, stalls, isSelected, onEdit, onDelete, viewMode = 'list' }) {
  const category = categories.find(c => c.id === product.categoryId);
  const [showMenu, setShowMenu] = useState(false);
  const [failedImage, setFailedImage] = useState(null);
  const menuRef = useRef(null);
  const shouldShowImage = Boolean(product.image) && failedImage !== product.image;
  const isGrid = viewMode === 'grid';

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
      className={`group relative flex cursor-pointer transition-all duration-200 ${
        isGrid
          ? 'h-full min-w-0 flex-col gap-0 overflow-hidden rounded-lg border bg-ui-surface shadow-sm'
          : 'flex-row items-center gap-4 rounded-none border-0 border-b border-ui-border bg-transparent'
      } ${
        isSelected
          ? isGrid
            ? 'border-brand-action bg-brand-action/8 ring-2 ring-inset ring-brand-action'
            : 'bg-brand-action/12 ring-2 ring-inset ring-brand-action'
          : isGrid
            ? 'border-ui-border hover:-translate-y-0.5 hover:border-brand-action/70 hover:bg-ui-muted hover:shadow-lg'
            : 'hover:bg-ui-muted'
      }`}
      onClick={() => onEdit(product)}
      aria-current={isSelected ? 'true' : undefined}
    >
      {/* Card-mode overlay badges & menu */}
      {isGrid && (
        <>
          <div className="absolute top-3 left-3 z-10">
            <StatusBadge active={product.available} activeLabel="In Stock" inactiveLabel="Out of Stock" className="shadow-sm" />
          </div>
          <div className="flex items-center justify-center absolute top-3 right-3 z-10" ref={menuRef}>
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-ui-border bg-ui-elevated text-text-soft shadow-sm backdrop-blur transition-all hover:border-brand-action/50 hover:bg-ui-muted hover:text-text-strong active:scale-95"
              aria-label={`Open actions for ${product.name}`}
            >
              <Icon name="moreVertical" className="w-4 h-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-10 flex w-36 flex-col gap-1 rounded-lg border border-ui-border bg-ui-elevated p-1 shadow-xl">
                <button type="button" onClick={(e) => { e.stopPropagation(); setShowMenu(false); onEdit(product); }} className="flex cursor-pointer items-center gap-2 rounded-md border-0 bg-transparent px-3 py-2 text-left text-brand-action hover:bg-brand-action/12">
                  <Icon name="edit" className="w-3.5 h-3.5" strokeWidth={2} />
                  <span className="text-sm font-semibold">Edit</span>
                </button>
                <button type="button" onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(product.id); }} className="flex cursor-pointer items-center gap-2 rounded-md border-0 bg-transparent px-3 py-2 text-left text-state-danger hover:bg-state-danger/12">
                  <Icon name="delete" className="w-3.5 h-3.5" strokeWidth={2} />
                  <span className="text-sm font-semibold">Delete</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <div className={`flex ${isGrid ? 'flex-col gap-0 w-full h-full' : 'flex-row items-center gap-3 w-full h-full px-4 pr-5 py-3'}`}>
        {/* Thumbnail */}
        <div className={isGrid
          ? 'aspect-[4/3] w-full shrink-0 overflow-hidden border-b border-ui-border bg-ui-bg'
          : 'h-10 w-[40px] shrink-0 overflow-hidden rounded-lg border border-ui-border bg-ui-bg'
        }>
          {shouldShowImage
            ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" loading="lazy" onError={() => setFailedImage(product.image)} />
            : <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-400">
                {isGrid && <Icon name="product" className="w-6 h-6" strokeWidth={1.5} />}
                <span className={`font-bold ${isGrid ? 'text-[11px] tracking-widest' : 'text-[9px] tracking-normal'}`}>IMG</span>
              </div>
          }
        </div>

        {/* Info Area */}
        <div className={`flex ${
          isGrid
            ? `min-h-[120px] flex-col p-4 transition-colors ${isSelected ? 'bg-brand-action/10' : 'bg-ui-surface group-hover:bg-ui-muted'}`
            : 'flex-row items-center gap-4 p-0'
        } flex-1 min-w-0`}>
          {/* Name */}
          <div className="flex-1 min-w-0">
            <p className="m-0 truncate text-sm font-bold text-text-strong">
              {product.name}
            </p>
            {stalls && stalls.length > 0 && (
              <p className="m-0 mt-1 truncate text-[11px] leading-tight text-text-soft">
                {product.stallIds && product.stallIds.length > 0
                  ? stalls.filter(s => product.stallIds.includes(s.id)).map(s => s.name).join(', ')
                  : 'No stalls'}
              </p>
            )}
          </div>

          {/* Category — list only */}
          {!isGrid && (
            <div className="w-[90px] shrink-0">
              <span className="text-xs font-medium text-text-soft">
                {category?.name ?? '\u2014'}
              </span>
            </div>
          )}

          {/* Price USD + KHR */}
          <div className={isGrid ? 'mt-auto flex w-full items-baseline justify-between border-t border-ui-border pt-2' : 'w-[110px] shrink-0'}>
            <p className="m-0 text-sm font-bold text-text-strong">
              {money(product.price)}
            </p>
            <p className="m-0 text-xs font-medium text-text-soft">
              {toKHR(product.price)}៛
            </p>
          </div>

          {/* Status badge — list only */}
          {!isGrid && (
            <div className="w-[90px] shrink-0">
              <StatusBadge active={product.available} activeLabel="In Stock" inactiveLabel="Out of Stock" />
            </div>
          )}

          {/* Actions — list only */}
          {!isGrid && (
            <div className="flex items-center gap-1 w-[96px] shrink-0" onClick={e => e.stopPropagation()}>
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
          )}
        </div>
      </div>
    </div>
  );
}

// ── Editor panel ──────────────────────────────────────────────────────────────
function EditorPanel({ form, setForm, categories, stalls, stallsLoading, stallsError, onSave, onCancel, isNew, actionError }) {
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [priceValidationError, setPriceValidationError] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    const parsedPrice = Number(form.price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setPriceValidationError(
        (form.stallIds || []).length > 0
          ? 'Enter a valid positive price before assigning this product to a stall.'
          : 'Enter a valid positive default price for this product.'
      );
      return;
    }
    setPriceValidationError('');
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
    <div className="flex flex-col bg-white rounded-2xl overflow-hidden h-full border border-[#e5e7eb] shadow-2xl min-[1200px]:shadow-none w-full min-[1200px]:min-w-[340px] min-[1200px]:max-w-[465px]">
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
          {actionError && <Alert variant="danger">{actionError}</Alert>}
          {priceValidationError && <Alert variant="warning">{priceValidationError}</Alert>}

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
              onChange={e => {
                setPriceValidationError('');
                setForm(f => ({ ...f, price: e.target.value }));
              }}
              placeholder="2.00"
              error={priceValidationError || undefined}
              required
            />
            <FormInput
              label="Price (KHR)"
              type="number" min="0" step="1"
              value={form.price === '' || isNaN(parseFloat(form.price)) ? '' : Math.round(parseFloat(form.price) * KHR_RATE)}
              onChange={e => {
                setPriceValidationError('');
                const val = e.target.value;
                if (val === '') {
                  setForm(f => ({ ...f, price: '' }));
                } else {
                  const usd = parseFloat(val) / KHR_RATE;
                  setForm(f => ({ ...f, price: usd.toString() }));
                }
              }}
              placeholder="8000"
              error={priceValidationError || undefined}
              required
            />
          </div>

          {/* Availability */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#374151', fontFamily: 'Inter, sans-serif' }}>Available for sale</p>
              <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', fontFamily: 'Inter, sans-serif' }}>Visible to cashiers</p>
            </div>
            <Switch checked={form.available} onChange={v => setForm(f => ({ ...f, available: v }))} />
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
  actionError,
  clearActionError,
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
  const [productPage, setProductPage] = useState(1);
  const [viewMode, setViewMode] = useState('list');
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1200);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1200);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const effectiveViewMode = isDesktop ? viewMode : 'grid';

  const loadStalls = useCallback(async (showSpinner = false) => {
    try {
      if (showSpinner) setStallsLoading(true);
      const data = await api.stalls.getAll();
      setStalls(data);
      setStallsError('');
      return data;
    } catch (err) {
      setStallsError(err.message || 'Failed to load stalls.');
      return [];
    } finally {
      if (showSpinner) setStallsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadStalls(true);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadStalls]);

  useAutoRefresh(() => loadStalls(false), {
    intervalMs: 30000,
  });

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

  const productTotalPages = Math.ceil(filtered.length / PRODUCT_PAGE_SIZE) || 1;
  const currentProductPage = Math.min(productPage, productTotalPages);
  const paginatedProducts = useMemo(() => {
    const start = (currentProductPage - 1) * PRODUCT_PAGE_SIZE;
    return filtered.slice(start, start + PRODUCT_PAGE_SIZE);
  }, [filtered, currentProductPage]);

  const openEditor = (product) => {
    clearActionError?.();
    setEditing({
      ...product,
      stallIds: product.stallIds || (product.stallId ? [Number(product.stallId)] : [])
    });
    onEditProduct(product);
  };

  const openNew = () => {
    clearActionError?.();
    const blank = emptyForm();
    setEditing(blank);
    setProductForm(blank);
  };

  const handleSave = async (formData) => {
    setProductForm(formData);
    const saved = await onSaveProduct(formData);
    if (saved) setEditing(null);
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
        {actionError && <Alert variant="danger">{actionError}</Alert>}
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
      {actionError && <Alert variant="danger">{actionError}</Alert>}
      {/* Tab pills + Search bar + Add button */}
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <TabPills tabs={TABS} activeId={subTab} onChange={setSubTab} className="w-fit" />

        {/* Search */}
        <div className="min-w-[220px] flex-1 relative max-[640px]:order-3 max-[640px]:basis-full">
          <Icon name="search" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" strokeWidth={2} />
          <input
            type="text" placeholder="Search products..."
            value={search} onChange={e => { setSearch(e.target.value); setProductPage(1); }}
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
            <div className="flex items-center justify-between w-full">
              <div>
                <div className="flex items-center gap-3">
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827', fontFamily: 'Inter, sans-serif' }}>
                    Menu Items
                  </h3>
                  {loading && <span className="text-xs text-[#6b7280] animate-pulse">Loading...</span>}
                  {error && <span className="text-xs text-[#ef4444]">{error}</span>}
                </div>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af', fontFamily: 'Inter, sans-serif' }}>
                  {filtered.length} product{filtered.length !== 1 ? 's' : ''} · click {effectiveViewMode === 'list' ? 'a row' : 'a card'} to edit
                </p>
              </div>

              {/* View toggle — Desktop only */}
              <div className="hidden min-[1200px]:flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`flex items-center justify-center w-8 h-8 rounded-md border-0 cursor-pointer transition-all ${
                    viewMode === 'list' ? 'bg-white shadow-sm text-[#111827]' : 'bg-transparent text-gray-400 hover:text-gray-600'
                  }`}
                  title="List view"
                  aria-label="List view"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <line x1="1" y1="3" x2="15" y2="3" />
                    <line x1="1" y1="8" x2="15" y2="8" />
                    <line x1="1" y1="13" x2="15" y2="13" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center justify-center w-8 h-8 rounded-md border-0 cursor-pointer transition-all ${
                    viewMode === 'grid' ? 'bg-white shadow-sm text-[#111827]' : 'bg-transparent text-gray-400 hover:text-gray-600'
                  }`}
                  title="Grid view"
                  aria-label="Grid view"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="1" width="5.5" height="5.5" rx="1" />
                    <rect x="9.5" y="1" width="5.5" height="5.5" rx="1" />
                    <rect x="1" y="9.5" width="5.5" height="5.5" rx="1" />
                    <rect x="9.5" y="9.5" width="5.5" height="5.5" rx="1" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="grid w-full grid-cols-3 gap-2 max-[640px]:grid-cols-1">
              <select
                value={categoryFilter}
                onChange={e => { setCategoryFilter(e.target.value); setProductPage(1); }}
                className="h-9 min-w-0 w-full cursor-pointer rounded-lg border border-gray-200 bg-white px-2 text-xs font-semibold text-gray-700 outline-none focus:border-[#003ec7]"
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={stallFilter}
                onChange={e => { setStallFilter(e.target.value); setProductPage(1); }}
                className="h-9 min-w-0 w-full cursor-pointer rounded-lg border border-gray-200 bg-white px-2 text-xs font-semibold text-gray-700 outline-none focus:border-[#003ec7]"
              >
                <option value="">All Stalls</option>
                {stalls.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setProductPage(1); }}
                className="h-9 min-w-0 w-full cursor-pointer rounded-lg border border-gray-200 bg-white px-2 text-xs font-semibold text-gray-700 outline-none focus:border-[#003ec7]"
              >
                <option value="">All Statuses</option>
                <option value="available">In Stock</option>
                <option value="unavailable">Out of Stock</option>
              </select>
            </div>
          </div>

          {/* Column headers — list mode only */}
          {effectiveViewMode === 'list' && (
            <div className="flex items-center gap-3 px-4 pr-5 py-2 border-b border-[#f3f4f6] bg-[#fafafa]">
              <span className="w-[40px] shrink-0 text-[11px] font-bold text-gray-400 uppercase tracking-wider font-sans">Photo</span>
              <span className="flex-1 min-w-0 text-[11px] font-bold text-gray-400 uppercase tracking-wider font-sans">Name</span>
              <span className="w-[90px] shrink-0 text-[11px] font-bold text-gray-400 uppercase tracking-wider font-sans">Category</span>
              <span className="w-[110px] shrink-0 text-[11px] font-bold text-gray-400 uppercase tracking-wider font-sans">Price</span>
              <span className="w-[90px] shrink-0 text-[11px] font-bold text-gray-400 uppercase tracking-wider font-sans">Status</span>
              <span className="w-[96px] shrink-0 text-[11px] font-bold text-gray-400 uppercase tracking-wider font-sans">Actions</span>
            </div>
          )}

          {/* Rows */}
          <div className={`flex-1 overflow-y-auto ${effectiveViewMode === 'grid' ? 'p-4' : 'p-0'}`}>
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
              <div
                className={effectiveViewMode === 'grid' ? (isDesktop ? '' : 'grid grid-cols-1 min-[480px]:grid-cols-2 min-[800px]:grid-cols-3 gap-4') : 'flex flex-col gap-0'}
                style={effectiveViewMode === 'grid' && isDesktop ? {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                  alignItems: 'stretch',
                  gap: '16px',
                } : undefined}
              >
                {paginatedProducts.map(product => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    categories={categories}
                    stalls={stalls}
                    isSelected={editingProduct?.id === product.id}
                    onEdit={openEditor}
                    onDelete={handleDelete}
                    onToggle={onToggleProductAvailability}
                    viewMode={effectiveViewMode}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {productTotalPages > 1 && (
            <div className="px-5 py-3 border-t border-[#f3f4f6] flex items-center justify-between">
              <span className="text-[12px] text-gray-400">
                Page {currentProductPage} of {productTotalPages} · {filtered.length} product{filtered.length !== 1 ? 's' : ''}
              </span>
              <Pagination
                currentPage={currentProductPage}
                totalPages={productTotalPages}
                onPageChange={setProductPage}
              />
            </div>
          )}
        </div>

        {/* Right — editor panel (shown when editing) */}
        {editingProduct !== null && (
          <>
            <div className="min-[1200px]:hidden fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm" onClick={handleCancel} />
            <div className="fixed min-[1200px]:static inset-x-4 top-16 bottom-4 min-[1200px]:inset-auto z-50 min-[1200px]:z-auto">
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
                actionError={actionError}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
