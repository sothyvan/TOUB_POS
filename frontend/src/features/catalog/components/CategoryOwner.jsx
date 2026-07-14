import { useState } from 'react';
import { TONES } from '../../../data/seedData';
import OwnerCrudTable from './OwnerCrudTable';
import FormInput from '../../../components/ui/FormInput';
import FormSelect from '../../../components/ui/FormSelect';
import FormActions from '../../../components/ui/FormActions';
import StatusBadge from '../../../components/ui/StatusBadge';
import Icon from '../../../components/ui/Icon';
import Alert from '../../../components/ui/Alert';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import ModalShell from '../../../components/ui/ModalShell';
import useOwnerForm from '../../../hooks/useOwnerForm';
import { getToneSwatchClass, getToneBadgeClass } from '../../../utils/toneClasses';
import { money } from '../../../utils/format';

export default function CategoryOwner({
  categoryForm,
  setCategoryForm,
  categories,
  products,
  onSave,
  onEdit,
  onDelete,
  onCancel,
  onEditProduct,
  onMoveProducts,
  loading,
  error,
}) {
  const { isFormOpen, handleSubmit, handleCancel, handleAddNewClick } =
    useOwnerForm(categoryForm, { onSave, onCancel });

  const [expandedCats, setExpandedCats] = useState({});
  const [assignCategory, setAssignCategory] = useState(null);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [movingProduct, setMovingProduct] = useState(null);
  const [destinationCategoryId, setDestinationCategoryId] = useState('');
  const [moveError, setMoveError] = useState('');
  const [isMoving, setIsMoving] = useState(false);

  const toggleExpand = (id) => {
    setExpandedCats((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const closeAssignDialog = () => {
    if (isMoving) return;
    setAssignCategory(null);
    setSelectedProductIds([]);
    setProductSearch('');
    setMoveError('');
  };

  const openAssignDialog = (category) => {
    setAssignCategory(category);
    setSelectedProductIds([]);
    setProductSearch('');
    setMoveError('');
  };

  const closeMoveDialog = () => {
    if (isMoving) return;
    setMovingProduct(null);
    setDestinationCategoryId('');
    setMoveError('');
  };

  const openMoveDialog = (product) => {
    const firstDestination = categories.find(
      (category) => Number(category.id) !== Number(product.categoryId)
    );
    setMovingProduct(product);
    setDestinationCategoryId(firstDestination ? String(firstDestination.id) : '');
    setMoveError('');
  };

  const toggleProductSelection = (productId) => {
    setSelectedProductIds((current) => (
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    ));
  };

  const handleAssignProducts = async () => {
    if (!assignCategory || selectedProductIds.length === 0) return;
    setIsMoving(true);
    setMoveError('');
    const moved = await onMoveProducts(selectedProductIds, assignCategory.id);
    setIsMoving(false);
    if (moved) {
      closeAssignDialog();
    } else {
      setMoveError('The products could not all be moved. The list has been refreshed; please try again.');
    }
  };

  const handleMoveProduct = async () => {
    if (!movingProduct || !destinationCategoryId) return;
    setIsMoving(true);
    setMoveError('');
    const moved = await onMoveProducts([movingProduct.id], Number(destinationCategoryId));
    setIsMoving(false);
    if (moved) {
      closeMoveDialog();
    } else {
      setMoveError('The product could not be moved. Please review the destination and try again.');
    }
  };

  const assignableProducts = assignCategory
    ? products.filter((product) => {
        if (Number(product.categoryId) === Number(assignCategory.id)) return false;
        const query = productSearch.trim().toLowerCase();
        if (!query) return true;
        const sourceCategory = categories.find(
          (category) => Number(category.id) === Number(product.categoryId)
        );
        return [product.name, product.code, sourceCategory?.name]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query));
      })
    : [];

  const renderCategory = (category) => {
    const categoryProducts = products.filter((product) => product.categoryId === category.id);
    const isExpanded = expandedCats[category.id];

    return (
      <div className={`flex min-w-0 w-full flex-col rounded-md transition-colors ${isExpanded ? 'bg-brand-action/8' : ''}`}>
        <div className="flex items-center justify-between gap-3.5 min-w-0">
          <div className="flex items-center gap-3.5">
            <button 
              type="button" 
              onClick={() => toggleExpand(category.id)}
              className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border transition-colors ${
                isExpanded
                  ? 'border-brand-action bg-brand-action text-[#090807]'
                  : 'border-ui-border bg-ui-muted text-text-soft hover:border-brand-action/60 hover:bg-brand-action/12 hover:text-brand-action'
              }`}
              aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${category.name}`}
              aria-expanded={Boolean(isExpanded)}
            >
              <Icon name="chevronDown" className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            <span className={`h-7 w-7 shrink-0 rounded-full border border-ui-border shadow-sm ${getToneSwatchClass(category.tone)}`} />
            <div>
              <strong className="block text-[15px] font-bold text-text-strong">{category.name}</strong>
              <button
                type="button"
                className="mt-0.5 block cursor-pointer border-0 bg-transparent p-0 text-xs font-bold text-text-soft hover:text-brand-action hover:underline"
                onClick={() => toggleExpand(category.id)}
              >
                {categoryProducts.length} items
              </button>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            iconName="plus"
            className="shrink-0"
            onClick={() => openAssignDialog(category)}
          >
            <span className="max-[520px]:hidden">Add products</span>
            <span className="hidden max-[520px]:inline">Add</span>
          </Button>
        </div>

        {isExpanded && categoryProducts.length > 0 && (
          <div className="ml-10 mt-4 flex flex-col gap-3 border-l-2 border-brand-action/35 pl-4">
            {categoryProducts.map((product) => (
              <div key={product.id} className="flex min-w-0 flex-wrap items-center gap-3.5 rounded-md border border-ui-border bg-ui-muted p-2 transition-colors hover:border-brand-action/60 hover:bg-brand-action/10">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-10 w-10 shrink-0 rounded-md border border-ui-border bg-ui-surface object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-ui-border bg-ui-surface text-[9px] font-bold text-text-soft">
                    No img
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <strong className="block truncate text-[14px] font-bold leading-none text-text-strong">
                    {product.name}
                  </strong>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded border border-ui-border bg-ui-surface px-1.5 py-0.5 font-mono text-[11px] font-bold tracking-tight text-text-soft">
                      {product.code}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border ${getToneBadgeClass(category.tone)}`}>
                      {category.name}
                    </span>
                    <span className="text-[12px] font-black text-brand-action">
                      {money(product.price)}
                    </span>
                    <StatusBadge active={product.available} activeLabel="Visible" inactiveLabel="Hidden" className="scale-90 origin-left" />
                  </div>
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <Button size="sm" variant="ghost" iconName="edit" onClick={() => onEditProduct(product)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    iconName="arrowRight"
                    disabled={categories.length < 2}
                    onClick={() => openMoveDialog(product)}
                  >
                    Move
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {isExpanded && categoryProducts.length === 0 && (
          <div className="ml-10 mt-4 border-l-2 border-brand-action/35 pl-4">
            <EmptyState
              className="py-6"
              iconName="product"
              title="No products in this category"
              message="Use Add products to move existing products here."
              action={(
                <Button size="sm" variant="outline" iconName="plus" onClick={() => openAssignDialog(category)}>
                  Add products
                </Button>
              )}
            />
          </div>
        )}
      </div>
    );
  };

  const renderForm = ({ onCancel }) => (
    <form className="grid gap-4.5" onSubmit={handleSubmit}>
      <FormInput
        label="Name"
        value={categoryForm.name}
        onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))}
        placeholder="Smoothies"
        required
      />

      <FormSelect
        label="Color Tone"
        value={categoryForm.tone}
        onChange={(event) => setCategoryForm((current) => ({ ...current, tone: event.target.value }))}
      >
        {TONES.map((tone) => (
          <option key={tone} value={tone}>
            {tone}
          </option>
        ))}
      </FormSelect>

      <FormActions submitLabel={categoryForm.id ? 'Save category' : 'Add category'} onCancel={onCancel} />
    </form>
  );

  return (
    <>
      <OwnerCrudTable
        title="Categories"
        items={categories}
        renderItem={renderCategory}
        itemLabel="category"
        addButtonLabel="Add Category"
        onAdd={handleAddNewClick}
        onEdit={onEdit}
        onDelete={onDelete}
        isFormOpen={isFormOpen}
        modalTitle={categoryForm.id ? 'Edit category' : 'Create category'}
        onFormClose={handleCancel}
        formContent={renderForm}
        loading={loading}
        error={error}
      />

      <ModalShell
        isOpen={Boolean(assignCategory)}
        onClose={closeAssignDialog}
        onBackdropClick={closeAssignDialog}
        labelledBy="assign-products-title"
        showCloseButton
        size="lg"
      >
        <div className="flex max-h-[85svh] flex-col">
          <div className="border-b border-ui-border px-5 py-5 pr-16 sm:px-6">
            <h2 id="assign-products-title" className="m-0 text-lg font-extrabold text-text-strong">
              Add products to {assignCategory?.name}
            </h2>
            <p className="mt-1 text-sm font-medium text-text-muted">
              Products belong to one category. Selected products will move from their current category.
            </p>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
            <FormInput
              label="Search products"
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              placeholder="Search by product, code, or category"
            />
            {moveError && <Alert variant="danger">{moveError}</Alert>}

            {assignableProducts.length > 0 ? (
              <div className="space-y-2" role="group" aria-label="Products to move">
                {assignableProducts.map((product) => {
                  const sourceCategory = categories.find(
                    (category) => Number(category.id) === Number(product.categoryId)
                  );
                  const checked = selectedProductIds.includes(product.id);
                  return (
                    <label
                      key={product.id}
                      className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
                        checked
                          ? 'border-brand-action bg-brand-action/10'
                          : 'border-ui-border bg-ui-surface hover:border-brand-action/45 hover:bg-ui-muted'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleProductSelection(product.id)}
                        className="h-4 w-4 shrink-0 accent-[var(--color-brand-action)]"
                      />
                      {product.image ? (
                        <img src={product.image} alt="" className="h-10 w-10 rounded-md border border-ui-border object-cover" />
                      ) : (
                        <div className="grid h-10 w-10 place-items-center rounded-md border border-ui-border bg-ui-muted text-text-muted">
                          <Icon name="product" className="h-4 w-4" />
                        </div>
                      )}
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm text-text-strong">{product.name}</strong>
                        <span className="block truncate text-xs font-semibold text-text-muted">
                          Currently in {sourceCategory?.name || 'another category'}
                        </span>
                      </span>
                      <span className="text-sm font-black text-brand-action">{money(product.price)}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                iconName="product"
                title={productSearch ? 'No matching products' : 'All products are already here'}
                message={productSearch ? 'Try a different search term.' : 'There are no products available to move into this category.'}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ui-border px-5 py-4 sm:px-6">
            <span className="text-xs font-bold text-text-muted">
              {selectedProductIds.length} selected
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={closeAssignDialog} disabled={isMoving}>Cancel</Button>
              <Button
                onClick={handleAssignProducts}
                loading={isMoving}
                disabled={selectedProductIds.length === 0}
              >
                Move {selectedProductIds.length || ''} product{selectedProductIds.length === 1 ? '' : 's'}
              </Button>
            </div>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        isOpen={Boolean(movingProduct)}
        onClose={closeMoveDialog}
        onBackdropClick={closeMoveDialog}
        labelledBy="move-product-title"
        showCloseButton
        size="sm"
      >
        <div className="space-y-5 p-5 pr-16 sm:p-6 sm:pr-16">
          <div>
            <h2 id="move-product-title" className="m-0 text-lg font-extrabold text-text-strong">
              Move {movingProduct?.name}
            </h2>
            <p className="mt-1 text-sm font-medium text-text-muted">
              Choose the product's new category. Other product details will stay unchanged.
            </p>
          </div>
          {moveError && <Alert variant="danger">{moveError}</Alert>}
          <FormSelect
            label="Destination category"
            value={destinationCategoryId}
            onChange={(event) => setDestinationCategoryId(event.target.value)}
            requiredLabel
          >
            {categories
              .filter((category) => Number(category.id) !== Number(movingProduct?.categoryId))
              .map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
          </FormSelect>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeMoveDialog} disabled={isMoving}>Cancel</Button>
            <Button onClick={handleMoveProduct} loading={isMoving} disabled={!destinationCategoryId}>
              Move product
            </Button>
          </div>
        </div>
      </ModalShell>
    </>
  );
}
