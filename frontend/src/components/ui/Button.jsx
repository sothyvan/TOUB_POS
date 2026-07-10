import Icon from './Icon';

const variantClasses = {
  primary:
    'border-transparent bg-brand-action text-white shadow-sm hover:bg-brand-action-hover focus-visible:ring-brand-action/30',
  secondary:
    'border-brand-border bg-white text-brand-text hover:bg-gray-50 focus-visible:ring-brand-action/20',
  outline:
    'border-brand-action/25 bg-white text-brand-action hover:bg-brand-action/5 focus-visible:ring-brand-action/20',
  ghost:
    'border-transparent bg-transparent text-brand-text hover:bg-gray-100 focus-visible:ring-brand-action/20',
  danger:
    'border-transparent bg-state-danger text-white shadow-sm hover:bg-state-danger/90 focus-visible:ring-state-danger/25',
  success:
    'border-transparent bg-state-success text-white shadow-sm hover:bg-state-success/90 focus-visible:ring-state-success/25',
  warning:
    'border-transparent bg-amber-500 text-white shadow-sm hover:bg-amber-600 focus-visible:ring-amber-500/25',
};

const sizeClasses = {
  sm: 'min-h-9 px-3 text-xs rounded-lg',
  md: 'min-h-11 px-4 text-sm rounded-xl',
  lg: 'min-h-12 px-5 text-[15px] rounded-xl',
  icon: 'h-10 w-10 px-0 rounded-full justify-center',
};

export default function Button({
  as: Component = 'button',
  children,
  className = '',
  disabled = false,
  fullWidth = false,
  icon,
  iconClassName = 'w-4 h-4',
  iconName,
  iconPosition = 'left',
  loading = false,
  size = 'md',
  type,
  variant = 'primary',
  ...rest
}) {
  const isNativeButton = Component === 'button';
  const isDisabled = disabled || loading;
  const resolvedVariant = variantClasses[variant] || variantClasses.primary;
  const resolvedSize = sizeClasses[size] || sizeClasses.md;
  const resolvedIcon = loading ? (
    <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden="true" />
  ) : (
    icon || (iconName ? <Icon name={iconName} className={iconClassName} /> : null)
  );

  return (
    <Component
      {...rest}
      type={isNativeButton ? (type || 'button') : type}
      disabled={isNativeButton ? isDisabled : undefined}
      aria-disabled={!isNativeButton && isDisabled ? 'true' : undefined}
      aria-busy={loading ? 'true' : undefined}
      className={`inline-flex items-center justify-center gap-2 border font-bold leading-none transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${fullWidth ? 'w-full' : ''} ${resolvedSize} ${resolvedVariant} ${className}`}
    >
      {resolvedIcon && iconPosition !== 'right' ? resolvedIcon : null}
      {children}
      {resolvedIcon && iconPosition === 'right' ? resolvedIcon : null}
    </Component>
  );
}
