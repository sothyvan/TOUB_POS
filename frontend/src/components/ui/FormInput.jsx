/**
 * Reusable labeled <input> with the standard owner-form styling.
 *
 * Props:
 *  - label       – visible label text (renders a wrapping <label>)
 *  - error       – validation or backend error text
 *  - helperText  – supporting text shown below the field
 *  - requiredLabel – shows a visual required marker beside the label
 *  - className   – extra classes merged onto the <input>
 *  - wrapperClassName – override the outer <label> classes
 *  - All other props are spread onto the native <input>.
 */
export default function FormInput({
  error,
  helperText,
  label,
  requiredLabel = false,
  className = '',
  wrapperClassName = 'grid gap-1.5 text-brand-text text-[13px] font-bold',
  ...rest
}) {
  const descriptionId = rest.id && (error || helperText) ? `${rest.id}-description` : undefined;
  const describedBy = [rest['aria-describedby'], descriptionId].filter(Boolean).join(' ') || undefined;

  return (
    <label className={wrapperClassName}>
      {label ? (
        <span className="flex items-center gap-1">
          {label}
          {requiredLabel ? <span className="text-state-danger">*</span> : null}
        </span>
      ) : null}
      <input
        {...rest}
        aria-describedby={describedBy}
        aria-invalid={error ? 'true' : undefined}
        className={`w-full min-h-11.5 px-3.5 border rounded-xl bg-white text-brand-text text-[14px] font-semibold outline-none transition-all placeholder:text-gray-300 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 ${error ? 'border-state-danger focus:border-state-danger focus:ring-1 focus:ring-state-danger' : 'border-brand-border focus:border-brand-action focus:ring-1 focus:ring-brand-action'} ${className}`}
      />
      {error || helperText ? (
        <span
          id={descriptionId}
          className={`text-[11px] font-semibold leading-relaxed ${error ? 'text-state-danger' : 'text-gray-400'}`}
        >
          {error || helperText}
        </span>
      ) : null}
    </label>
  );
}
