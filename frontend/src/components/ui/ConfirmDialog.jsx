import ModalShell from './ModalShell';
import Button from './Button';

const sizeClasses = {
  compact: {
    panel:
      'w-full bg-white/80 max-w-100 rounded-3xl border border-brand-border bg-brand-card shadow-[0_20px_50px_rgba(52,45,35,0.15)] p-6 text-center',
    title: 'text-xl font-black tracking-tight mb-2',
    message: 'text-[14px] leading-relaxed mb-6 font-semibold',
    actions: 'gap-3',
    button: 'min-h-12 rounded-xl font-bold',
  },
  large: {
    panel:
      'w-135 bg-white/80 max-w-full rounded-4xl bg-brand-yellow shadow-[0_24px_64px_rgba(0,0,0,0.24)] p-8 text-center',
    title: 'text-3xl font-extrabold tracking-tight mb-8 mt-2',
    message: 'text-base leading-relaxed mb-6 font-semibold',
    actions: 'gap-6',
    button: 'h-15 rounded-2xl text-2xl font-black',
  },
};

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  icon,
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  cancelTone = 'danger',
  confirmTone = 'success',
  size = 'large',
  overlayClassName,
  panelClassName = '',
  isBusy = false,
  isConfirmDisabled = false,
  onCancel,
  onConfirm,
}) {
  const styles = sizeClasses[size] || sizeClasses.large;
  const titleId = `confirm-dialog-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <ModalShell
      isOpen={isOpen}
      labelledBy={titleId}
      overlayClassName={overlayClassName}
      panelClassName={`${styles.panel} ${panelClassName}`}
    >
      <div className="flex flex-col items-center">
        {icon}
        <h3 id={titleId} className={`m-0 text-brand-dark ${styles.title}`}>
          {title}
        </h3>
        {message ? (
          <div className={`m-0 text-brand-subtext ${styles.message}`}>
            {message}
          </div>
        ) : null}
        <div className={`flex items-center justify-center w-full mb-2 ${styles.actions}`}>
          <Button
            className={`flex-1 ${styles.button}`}
            disabled={isBusy}
            size="md"
            variant={cancelTone}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            className={`flex-1 ${styles.button}`}
            disabled={isConfirmDisabled}
            loading={isBusy}
            size="md"
            variant={confirmTone}
            onClick={onConfirm}
          >
            {isBusy ? 'Processing...' : confirmLabel}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
