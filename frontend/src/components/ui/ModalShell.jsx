import { useEffect, useRef } from 'react';
import Icon from './Icon';

const sizeClasses = {
  sm: 'w-full max-w-sm rounded-lg border border-ui-border bg-ui-elevated shadow-[0_24px_70px_rgba(0,0,0,0.45)]',
  md: 'w-full max-w-md rounded-lg border border-ui-border bg-ui-elevated shadow-[0_24px_70px_rgba(0,0,0,0.45)]',
  lg: 'w-full max-w-2xl rounded-lg border border-ui-border bg-ui-elevated shadow-[0_24px_70px_rgba(0,0,0,0.45)]',
  xl: 'w-full max-w-4xl rounded-lg border border-ui-border bg-ui-elevated shadow-[0_24px_70px_rgba(0,0,0,0.45)]',
  full: 'w-[min(100%,72rem)] max-h-[92svh] rounded-lg border border-ui-border bg-ui-elevated shadow-[0_24px_70px_rgba(0,0,0,0.45)]',
};

export default function ModalShell({
  children,
  closeLabel = 'Close dialog',
  isOpen,
  onClose,
  onBackdropClick,
  overlayClassName = 'bg-black/75',
  panelClassName = '',
  labelledBy,
  showCloseButton = false,
  size,
}) {
  const panelRef = useRef(null);
  const closeHandlersRef = useRef({ onClose, onBackdropClick });

  useEffect(() => {
    closeHandlersRef.current = { onClose, onBackdropClick };
  }, [onBackdropClick, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previouslyFocused = document.activeElement;
    const panel = panelRef.current;
    panel?.focus({ preventScroll: true });

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        const closeDialog = closeHandlersRef.current.onClose || closeHandlersRef.current.onBackdropClick;
        if (closeDialog) {
          event.preventDefault();
          closeDialog();
        }
        return;
      }

      if (event.key !== 'Tab' || !panel) return;
      const focusable = Array.from(panel.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      ));
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [isOpen]);

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
        ref={panelRef}
        tabIndex={-1}
        className={`relative animate-in fade-in zoom-in-95 duration-200 ${resolvedPanelClass} ${panelClassName}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        {showCloseButton && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-md border border-ui-border bg-ui-surface text-text-soft transition-all hover:border-brand-action/50 hover:text-brand-text active:scale-95"
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
