export default function FormActions({ submitLabel, onCancel }) {
  return (
    <div className="flex items-center gap-2.5 mt-4">
      <button
        className="flex-1 min-h-12 rounded-xl font-bold bg-brand-action hover:bg-brand-action/90 active:scale-[0.98] transition-all text-white border-0 cursor-pointer shadow-sm"
        type="submit"
      >
        {submitLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 min-h-12 border border-brand-border rounded-xl bg-white text-brand-text font-bold hover:bg-gray-50 active:scale-[0.98] transition-all cursor-pointer"
      >
        Cancel
      </button>
    </div>
  );
}
