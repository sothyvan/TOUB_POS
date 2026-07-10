export default function LoadingState({
  className = '',
  label = 'Loading...',
  size = 'md',
}) {
  const spinnerSize = size === 'sm' ? 'h-4 w-4' : 'h-6 w-6';

  return (
    <div className={`flex items-center justify-center gap-3 text-sm font-bold text-text-muted ${className}`} role="status">
      <span className={`${spinnerSize} rounded-full border-2 border-brand-action border-t-transparent animate-spin`} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
