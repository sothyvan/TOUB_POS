import { useState, useMemo } from 'react';
import OwnerFormModal from '../../../components/ui/OwnerFormModal';
import Icon from '../../../components/ui/Icon';
import Alert from '../../../components/ui/Alert';
import Button from '../../../components/ui/Button';
import Pagination from '../../../components/ui/Pagination';
import EmptyState from '../../../components/ui/EmptyState';
import LoadingState from '../../../components/ui/LoadingState';

const CLIENT_PAGE_SIZE = 12;

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
  pagination: serverPagination,
  onPageChange,
}) {
  const [clientPage, setClientPage] = useState(1);

  const clientPagination = useMemo(() => {
    const total = items.length;
    const totalPages = Math.ceil(total / CLIENT_PAGE_SIZE) || 1;
    return { page: clientPage, limit: CLIENT_PAGE_SIZE, total, totalPages };
  }, [items.length, clientPage]);

  const resolvedPagination = serverPagination || clientPagination;

  const displayedItems = useMemo(() => {
    if (serverPagination) return items;
    const start = (clientPage - 1) * CLIENT_PAGE_SIZE;
    return items.slice(start, start + CLIENT_PAGE_SIZE);
  }, [items, clientPage, serverPagination]);

  const handlePageChange = (newPage) => {
    if (onPageChange) {
      onPageChange(newPage);
    } else {
      setClientPage(newPage);
    }
  };
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
      <div className="border border-brand-border rounded-lg bg-ui-surface p-6 max-[640px]:p-4 grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3 mb-2">
          <div className="flex items-center gap-3">
            <h3 className="m-0 text-brand-dark text-lg font-black tracking-tight">{title}</h3>
            {loading && <LoadingState label="Loading..." size="sm" className="text-xs" />}
          </div>
          <Button
            onClick={onAdd}
            iconName="plusCompact"
            iconClassName="w-4.5 h-4.5"
            size="sm"
            className="rounded-md"
          >
            {label}
          </Button>
        </div>

        {error && (
          <Alert variant="danger" className="rounded-xl px-3 py-2 text-xs">
            {error}
          </Alert>
        )}

        {displayedItems.map((item) => (
          <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-ui-border px-2 py-4.5 transition-colors first-of-type:border-t-0 hover:bg-ui-muted max-[640px]:grid-cols-1">
            {renderItem(item)}
            <div className="flex items-center gap-2 max-[640px]:justify-end">
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="w-9 h-9 border border-brand-border rounded-md bg-ui-surface text-text-soft flex items-center justify-center transition-all cursor-pointer active:scale-95 hover:bg-brand-action hover:text-[#090807] hover:border-brand-action"
                title={editLabel(item)}
                aria-label={editLabel(item)}
              >
                <Icon name="edit" className="w-4.5 h-4.5" />
              </button>

              {onToggle && (
                <button
                  type="button"
                  onClick={() => onToggle(item.id)}
                  className="w-9 h-9 border border-brand-border rounded-md bg-ui-surface text-text-soft flex items-center justify-center transition-all cursor-pointer active:scale-95 hover:bg-ui-muted hover:text-brand-dark"
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
                className="w-9 h-9 border border-brand-border rounded-md bg-ui-surface text-text-soft flex items-center justify-center transition-all cursor-pointer active:scale-95 hover:bg-state-danger hover:text-white hover:border-state-danger"
                title={deleteLabel(item)}
                aria-label={deleteLabel(item)}
              >
                <Icon name="delete" className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        ))}
        {loading && items.length === 0 && (
          <LoadingState label={`Loading ${title.toLowerCase()}...`} className="py-10" />
        )}
        {!loading && items.length === 0 && (
          <EmptyState
            iconName="orders"
            title={`No ${title.toLowerCase()} found`}
            message={`Create the first ${itemLabel} when you are ready.`}
            className="my-2"
          />
        )}

        {resolvedPagination.totalPages > 1 && (
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-[12px] text-gray-400 mb-3">
              <span>Page {resolvedPagination.page} of {resolvedPagination.totalPages}</span>
              <span>{resolvedPagination.total} total</span>
            </div>
            <Pagination
              currentPage={resolvedPagination.page}
              totalPages={resolvedPagination.totalPages}
              onPageChange={handlePageChange}
            />
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
