/**
 * Reusable labeled checkbox with the standard admin-form styling.
 *
 * Props:
 *  - label       – visible label text beside the checkbox
 *  - className   – extra classes merged onto the <input type="checkbox">
 *  - wrapperClassName – override the outer <label> classes
 *  - All other props are spread onto the native <input type="checkbox">.
 */
export default function FormCheckbox({
  label,
  className = '',
  wrapperClassName = 'flex items-center gap-2.5 text-brand-text text-[13px] font-bold cursor-pointer mt-1 select-none',
  ...rest
}) {
  return (
    <label className={wrapperClassName}>
      <input
        type="checkbox"
        className={`w-4.5 h-4.5 accent-brand-action rounded ${className}`}
        {...rest}
      />
      {label}
    </label>
  );
}
