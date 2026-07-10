const variantClasses = {
  neutral: 'border-gray-200 bg-gray-100 text-gray-600',
  info: 'border-blue-100 bg-blue-50 text-blue-700',
  success: 'border-green-100 bg-green-50 text-green-700',
  warning: 'border-amber-100 bg-amber-50 text-amber-700',
  danger: 'border-red-100 bg-red-50 text-red-700',
  brand: 'border-brand-action/15 bg-brand-action/10 text-brand-action',
};

const dotClasses = {
  neutral: 'bg-gray-400',
  info: 'bg-blue-500',
  success: 'bg-state-success',
  warning: 'bg-amber-500',
  danger: 'bg-state-danger',
  brand: 'bg-brand-action',
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-[11px]',
};

export default function Badge({
  children,
  className = '',
  dot = false,
  size = 'sm',
  variant = 'neutral',
}) {
  const resolvedVariant = variantClasses[variant] || variantClasses.neutral;
  const resolvedDot = dotClasses[variant] || dotClasses.neutral;
  const resolvedSize = sizeClasses[size] || sizeClasses.sm;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-extrabold uppercase tracking-wide ${resolvedSize} ${resolvedVariant} ${className}`}>
      {dot ? <span className={`h-1.5 w-1.5 rounded-full ${resolvedDot}`} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
