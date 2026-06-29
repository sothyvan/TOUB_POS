import OwnerFormModal from '../ui/OwnerFormModal';
import Icon from '../ui/Icon';

export default function OwnerCrudTable({
  title,
  items,
  renderItem,
  onAdd,
  onEdit,
  onDelete,
  onToggle,
  toggleLabel,
  getToggleIcon,
  formContent,
  isFormOpen,
  onFormClose,
  modalTitle,
  modalMaxWidth,
  modalScroll = false,
  addButtonLabel,
  itemLabel = 'item',
  loading,
  error,
}) {
  const defaultToggleLabel = (item) => {
    if (item.available !== undefined) return item.available ? 'Hide' : 'Show';
    if (item.active !== undefined) return item.active ? 'Disable' : 'Enable';
    return 'Toggle';
  };

  const label = addButtonLabel || `Add ${title.slice(0, -1)}`;
  const getItemName = (item) => item.name || item.code || item.id;
  const editLabel = (item) => `Edit ${itemLabel}${getItemName(item) ? ` ${getItemName(item)}` : ''}`;
  const deleteLabel = (item) => `Delete ${itemLabel}${getItemName(item) ? ` ${getItemName(item)}` : ''}`;
  const getResolvedToggleLabel = (item) => {
    const action = toggleLabel ? toggleLabel(item) : defaultToggleLabel(item);
    return `${action} ${itemLabel}${getItemName(item) ? ` ${getItemName(item)}` : ''}`;
  };

  return (
    <div className="w-full">
      <div className="border border-brand-border rounded-3xl bg-brand-card shadow-[0_12px_36px_rgba(52,45,35,0.04)] p-6 grid gap-2">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-2">
          <div className="flex items-center gap-3">
            <h3 className="m-0 text-brand-dark text-lg font-black tracking-tight">{title}</h3>
            {loading && <span className="text-sm text-gray-500 animate-pulse">Loading...</span>}
            {error && <span className="text-sm text-red-500">{error}</span>}
          </div>
          <button
            type="button"
            onClick={onAdd}
            className="min-h-9.5 px-4 rounded-full bg-brand-action text-white text-xs font-bold hover:bg-brand-action/90 active:scale-95 transition-all cursor-pointer shadow-sm flex items-center gap-1"
          >
            <Icon name="plusCompact" className="w-4.5 h-4.5" strokeWidth={3} />
            {label}
          </button>
        </div>

        {items.map((item) => (
          <div key={item.id} className="py-4.5 px-0 border-t border-gray-100 grid grid-cols-[minmax(0,1fr)_auto] gap-4 items-center first-of-type:border-t-0">
            {renderItem(item)}
            <div className="flex items-center gap-2 max-[768px]:justify-start">
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="w-9 h-9 border border-brand-border rounded-full bg-white text-[#4f483f] flex items-center justify-center transition-all cursor-pointer active:scale-95 hover:bg-brand-action hover:text-white hover:border-brand-action"
                title={editLabel(item)}
                aria-label={editLabel(item)}
              >
                <Icon name="edit" className="w-4.5 h-4.5" />
              </button>

              {onToggle && (
                <button
                  type="button"
                  onClick={() => onToggle(item.id)}
                  className="w-9 h-9 border border-brand-border rounded-full bg-white text-[#4f483f] flex items-center justify-center transition-all cursor-pointer active:scale-95 hover:bg-gray-150 hover:text-brand-dark"
                  title={getResolvedToggleLabel(item)}
                  aria-label={getResolvedToggleLabel(item)}
                >
                  {getToggleIcon ? getToggleIcon(item) : (
                    item.available !== undefined ? (
                      item.available ? (
                        <Icon name="eye" className="w-4.5 h-4.5" />
                      ) : (
                        <Icon name="eye-off" className="w-4.5 h-4.5" />
                      )
                    ) : item.active !== undefined ? (
                      item.active ? (
                        <Icon name="disable" className="w-4.5 h-4.5" />
                      ) : (
                        <Icon name="enable" className="w-4.5 h-4.5" />
                      )
                    ) : null
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="w-9 h-9 border border-brand-border rounded-full bg-white text-[#4f483f] flex items-center justify-center transition-all cursor-pointer active:scale-95 hover:bg-state-danger hover:text-white hover:border-state-danger"
                title={deleteLabel(item)}
                aria-label={deleteLabel(item)}
              >
                <Icon name="delete" className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        ))}
        {!loading && items.length === 0 && (
          <div className="py-8 text-center text-gray-400 font-medium">
            No {title.toLowerCase()} found.
          </div>
        )}
      </div>

      <OwnerFormModal
        isOpen={isFormOpen}
        title={modalTitle}
        maxWidth={modalMaxWidth}
        scroll={modalScroll}
        onClose={onFormClose}
      >
        {formContent({ onCancel: onFormClose })}
      </OwnerFormModal>
    </div>
  );
}
