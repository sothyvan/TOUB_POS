import Icon from './Icon';

const sizeClasses = {
  sm: 'w-full max-w-sm rounded-2xl bg-white shadow-2xl',
  md: 'w-full max-w-md rounded-2xl bg-white shadow-2xl',
  lg: 'w-full max-w-2xl rounded-2xl bg-white shadow-2xl',
  xl: 'w-full max-w-4xl rounded-2xl bg-white shadow-2xl',
  full: 'w-[min(100%,72rem)] max-h-[92svh] rounded-3xl bg-white shadow-2xl',
};

export default function ModalShell({
  children,
  closeLabel = 'Close dialog',
  isOpen,
  onClose,
  onBackdropClick,
  overlayClassName = 'bg-black/60',
  panelClassName = '',
  labelledBy,
  showCloseButton = false,
  size,
}) {
  if (!isOpen) return null;

  const resolvedPanelClass = size ? sizeClasses[size] || sizeClasses.md : '';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${overlayClassName}`}
      role="presentation"
    >
      {onBackdropClick ? (
        <button
          className="absolute inset-0 border-0 bg-transparent cursor-pointer"
          type="button"
          aria-label="Close dialog"
          onClick={onBackdropClick}
        />
      ) : null}
      <div
        className={`relative animate-in fade-in zoom-in-95 duration-200 ${resolvedPanelClass} ${panelClassName}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        {showCloseButton && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full border border-gray-200 bg-white text-gray-500 transition-all hover:bg-gray-50 hover:text-brand-text active:scale-95"
            aria-label={closeLabel}
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        ) : null}
        {children}
      </div>
    </div>
  );
}
