export default function ModalShell({
  children,
  isOpen,
  onBackdropClick,
  overlayClassName = 'bg-black/60',
  panelClassName = '',
  labelledBy,
}) {
  if (!isOpen) return null;

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
        className={`relative animate-in fade-in zoom-in-95 duration-200 ${panelClassName}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        {children}
      </div>
    </div>
  );
}
