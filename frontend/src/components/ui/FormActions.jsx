import Button from './Button';

export default function FormActions({ submitLabel, onCancel }) {
  return (
    <div className="flex items-center gap-2.5 mt-4">
      <Button
        className="flex-1"
        size="lg"
        type="submit"
      >
        {submitLabel}
      </Button>
      <Button
        className="flex-1"
        size="lg"
        variant="secondary"
        onClick={onCancel}
      >
        Cancel
      </Button>
    </div>
  );
}
