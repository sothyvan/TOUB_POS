import Button from './Button';

export default function FormActions({ isSaving = false, submitLabel, onCancel }) {
  return (
    <div className="flex items-center gap-2.5 mt-4">
      <Button
        className="flex-1"
        size="lg"
        type="submit"
        loading={isSaving}
        disabled={isSaving}
      >
        {submitLabel}
      </Button>
      <Button
        className="flex-1"
        size="lg"
        variant="secondary"
        onClick={onCancel}
        disabled={isSaving}
      >
        Cancel
      </Button>
    </div>
  );
}
