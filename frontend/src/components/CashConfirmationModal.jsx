import ConfirmDialog from './ui/ConfirmDialog';

export default function CashConfirmationModal({ isOpen, isBusy = false, error, onCancel, onConfirm }) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      title="Did you receive the cash?"
      message={error || 'This will create the order, then mark it as paid on the backend.'}
      isBusy={isBusy}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
