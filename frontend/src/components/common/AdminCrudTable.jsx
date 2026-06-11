import AdminFormModal from '../ui/AdminFormModal';

export default function AdminCrudTable({
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
          <h3 className="m-0 text-brand-dark text-lg font-black tracking-tight">{title}</h3>
          <button
            type="button"
            onClick={onAdd}
            className="min-h-9.5 px-4 rounded-full bg-brand-action text-white text-xs font-bold hover:bg-brand-action/90 active:scale-95 transition-all cursor-pointer shadow-sm flex items-center gap-1"
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
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
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
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
                        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      )
                    ) : item.active !== undefined ? (
                      item.active ? (
                        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      ) : (
                        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
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
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      <AdminFormModal
        isOpen={isFormOpen}
        title={modalTitle}
        maxWidth={modalMaxWidth}
        scroll={modalScroll}
        onClose={onFormClose}
      >
        {formContent({ onCancel: onFormClose })}
      </AdminFormModal>
    </div>
  );
}
