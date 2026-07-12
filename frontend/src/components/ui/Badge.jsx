const variantClasses = {
  neutral: 'border-ui-border bg-ui-muted text-text-soft',
  info: 'border-brand-action/35 bg-brand-action/10 text-brand-action',
  success: 'border-state-success/35 bg-state-success/10 text-state-success',
  warning: 'border-state-warning/35 bg-state-warning/10 text-state-warning',
  danger: 'border-state-danger/35 bg-state-danger/10 text-state-danger',
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
    <span className={`inline-flex items-center gap-1 rounded-md border font-mono font-bold uppercase tracking-[0.08em] ${resolvedSize} ${resolvedVariant} ${className}`}>
      {dot ? <span className={`h-1.5 w-1.5 rounded-full ${resolvedDot}`} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
