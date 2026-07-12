export default function Switch({
  checked,
  className = '',
  description,
  disabled = false,
  label,
  onChange,
}) {
  const control = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full border border-ui-border p-0 transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-action/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-state-success' : 'bg-ui-muted'} ${className}`}
    >
      <span
        className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-[#f1efea] transition-all duration-200 ${checked ? 'left-5' : 'left-0.5'}`}
        aria-hidden="true"
      />
    </button>
  );

  if (!label && !description) return control;

  return (
    <label className="flex items-center justify-between gap-4 text-brand-text">
      <span className="min-w-0">
        {label ? <span className="block text-sm font-bold">{label}</span> : null}
        {description ? <span className="block text-xs font-semibold text-gray-400">{description}</span> : null}
      </span>
      {control}
    </label>
  );
}
