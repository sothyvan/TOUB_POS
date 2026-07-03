import { useEffect, useState, useMemo } from 'react';
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

  return (
    <div
      className="flex items-center gap-4 cursor-pointer transition-all duration-100"
      style={{
        padding: '12px 22px',
        borderBottom: '1px solid #f9fafb',
        background: isSelected ? '#f5f3ff' : 'transparent',
      }}
      onClick={() => onEdit(product)}
    >
      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-[9px] overflow-hidden shrink-0 border border-[#f3f4f6]"
        style={{ background: '#f9fafb' }}>
        {product.image
          ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-[#9ca3af]">IMG</div>
        }
      </div>

      {/* Name */}
      <div style={{ flex: '1 1 200px', minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827', fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {product.name}
        </p>
        {stalls && stalls.length > 0 && (
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280', fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {product.stallIds && product.stallIds.length > 0
              ? stalls.filter(s => product.stallIds.includes(s.id)).map(s => s.name).join(', ')
              : 'No assigned stalls'}
          </p>
        )}
      </div>

      {/* Category */}
      <div style={{ flex: '0 0 90px' }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', fontFamily: 'Inter, sans-serif' }}>
          {category?.name ?? '—'}
        </span>
      </div>

      {/* Price USD + KHR */}
      <div style={{ flex: '0 0 110px' }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827', fontFamily: 'Inter, sans-serif' }}>
          {money(product.price)}
        </p>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 400, color: '#9ca3af', fontFamily: 'Inter, sans-serif' }}>
          {toKHR(product.price)}៛
        </p>
      </div>

      {/* Status badge */}
      <div style={{ flex: '0 0 90px' }}>
        <StatusBadge active={product.available} activeLabel="In Stock" inactiveLabel="Out of Stock" />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
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
  );
}

// ── Editor panel ──────────────────────────────────────────────────────────────
function EditorPanel({ form, setForm, categories, stalls, stallsLoading, stallsError, onSave, onCancel, isNew }) {
  const liveKHR = toKHR(form.price);

  const handleSave = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="flex flex-col bg-white rounded-2xl overflow-hidden h-full border border-[#e5e7eb]" style={{ minWidth: 340, maxWidth: 465 }}>
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
            <div className="rounded-xl overflow-hidden border border-[#e5e7eb]" style={{ height: 180, background: '#fafafa' }}>
              {form.image
                ? <img src={form.image} alt="preview" className="w-full h-full object-cover" />
                : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#9ca3af]">
                    <Icon name="product" className="w-8 h-8" strokeWidth={1.5} />
                    <span style={{ fontSize: 12, fontFamily: 'Inter, sans-serif' }}>No photo — paste URL below</span>
                  </div>
                )
              }
            </div>
            <FormInput
              value={form.image || ''}
              onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
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
            <div className="grid gap-1.5 text-brand-text text-[13px] font-bold">
              <span>Price (KHR) — auto</span>
              <div className="flex items-center border border-[#e5e7eb] rounded-xl px-3"
                style={{ height: 46, background: '#f9fafb' }}>
                <span style={{ fontSize: 14, fontFamily: 'Inter, sans-serif', color: '#111827', fontWeight: 600 }}>
                  {liveKHR}
                </span>
                <span style={{ fontSize: 14, color: '#9ca3af', marginLeft: 2 }}>៛</span>
              </div>
            </div>
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

  const filtered = useMemo(() =>
    products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())),
    [products, search]
  );

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
          stalls={stalls}
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
          <div className="px-5 py-4 border-b border-[#f3f4f6]" style={{ minHeight: 80 }}>
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

          {/* Column headers */}
          <div className="flex items-center gap-4 px-5 py-2 border-b border-[#f3f4f6]"
            style={{ background: '#fafafa' }}>
            {[
              { label: 'Photo',    flex: '0 0 40px'  },
              { label: 'Name',     flex: '1 1 200px' },
              { label: 'Category', flex: '0 0 90px'  },
              { label: 'Price',    flex: '0 0 110px' },
              { label: 'Status',   flex: '0 0 90px'  },
              { label: 'Actions',  flex: '0 0 80px'  },
            ].map(col => (
              <span key={col.label} style={{
                flex: col.flex, fontSize: 11, fontWeight: 700,
                color: '#9ca3af', fontFamily: 'Inter, sans-serif',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {col.label}
              </span>
            ))}
          </div>

          {/* Rows */}
          <div className="flex-1 overflow-y-auto">
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
              filtered.map(product => (
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
              ))
            )}
          </div>
        </div>

        {/* Right — editor panel (shown when editing) */}
        {editingProduct !== null && (
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
        )}
      </div>
    </div>
  );
}
