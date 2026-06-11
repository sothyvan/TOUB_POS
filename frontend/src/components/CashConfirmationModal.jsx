import ConfirmDialog from './ui/ConfirmDialog';

export default function CashConfirmationModal({ isOpen, onCancel, onConfirm }) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      title="Did you receive the cash?"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
