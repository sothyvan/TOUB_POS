/**
 * Reusable labeled <input> with the standard admin-form styling.
 *
 * Props:
 *  - label       – visible label text (renders a wrapping <label>)
 *  - className   – extra classes merged onto the <input>
 *  - wrapperClassName – override the outer <label> classes
 *  - All other props are spread onto the native <input>.
 */
export default function FormInput({
  label,
  className = '',
  wrapperClassName = 'grid gap-1.5 text-brand-text text-[13px] font-bold',
  ...rest
}) {
  return (
    <label className={wrapperClassName}>
      {label}
      <input
        className={`w-full min-h-11.5 px-3.5 border border-brand-border rounded-xl bg-white text-brand-text text-[14px] font-semibold focus:border-brand-action focus:ring-1 focus:ring-brand-action outline-none transition-all placeholder:text-gray-300 ${className}`}
        {...rest}
      />
    </label>
  );
}
