/**
 * Reusable labeled <select> with the standard owner-form styling.
 *
 * Props:
 *  - label       – visible label text (renders a wrapping <label>)
 *  - children    – <option> elements
 *  - className   – extra classes merged onto the <select>
 *  - wrapperClassName – override the outer <label> classes
 *  - All other props are spread onto the native <select>.
 */
export default function FormSelect({
  label,
  children,
  className = '',
  wrapperClassName = 'grid gap-1.5 text-brand-text text-[13px] font-bold',
  ...rest
}) {
  return (
    <label className={wrapperClassName}>
      {label}
      <select
        className={`w-full min-h-11.5 px-3.5 border border-brand-border rounded-xl bg-white text-brand-text text-[14px] font-semibold focus:border-brand-action focus:ring-1 focus:ring-brand-action outline-none transition-all ${className}`}
        {...rest}
      >
        {children}
      </select>
    </label>
  );
}
