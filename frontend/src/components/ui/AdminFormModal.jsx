import Icon from './Icon';
import ModalShell from './ModalShell';

export default function AdminFormModal({
  children,
  isOpen,
  title,
  onClose,
  maxWidth = 'max-w-105',
  scroll = false,
}) {
  const titleId = `admin-form-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <ModalShell
      isOpen={isOpen}
      onBackdropClick={onClose}
      labelledBy={titleId}
      overlayClassName="bg-brand-dark/40"
      panelClassName={`w-full ${maxWidth} border border-brand-border rounded-3xl bg-brand-card shadow-[0_20px_50px_rgba(52,45,35,0.15)] p-6 z-10 ${scroll ? 'max-h-[90svh] overflow-y-auto' : ''}`}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-5 right-5 w-8.5 h-8.5 rounded-full border border-brand-border bg-white text-[#4f483f] grid place-items-center hover:bg-gray-150 cursor-pointer transition-all active:scale-90"
        aria-label="Close form"
      >
        <Icon name="close" className="w-4 h-4" />
      </button>
      <h3 id={titleId} className="m-0 text-brand-dark text-lg font-black tracking-tight border-b border-gray-100 pb-3 mb-4.5 pr-10">
        {title}
      </h3>
      {children}
    </ModalShell>
  );
}
