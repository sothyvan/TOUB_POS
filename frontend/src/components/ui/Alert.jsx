const variantClasses = {
  info: {
    dot: 'bg-brand-action',
    panel: 'border-blue-100 bg-blue-50 text-blue-900',
    title: 'text-blue-950',
  },
  success: {
    dot: 'bg-state-success',
    panel: 'border-green-100 bg-green-50 text-green-900',
    title: 'text-green-950',
  },
  warning: {
    dot: 'bg-amber-500',
    panel: 'border-amber-100 bg-amber-50 text-amber-900',
    title: 'text-amber-950',
  },
  danger: {
    dot: 'bg-state-danger',
    panel: 'border-red-100 bg-red-50 text-red-900',
    title: 'text-red-950',
  },
};

export default function Alert({
  actions,
  children,
  className = '',
  title,
  variant = 'info',
}) {
  const styles = variantClasses[variant] || variantClasses.info;

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold leading-relaxed ${styles.panel} ${className}`}
      role={variant === 'danger' || variant === 'warning' ? 'alert' : 'status'}
    >
      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${styles.dot}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title ? (
          <p className={`m-0 text-sm font-extrabold ${styles.title}`}>{title}</p>
        ) : null}
        {children ? <div className={title ? 'mt-1' : ''}>{children}</div> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
