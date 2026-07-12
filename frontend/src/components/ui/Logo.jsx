export default function Logo({ variant = 'topbar', className = '' }) {
  const sizeClassName = variant === 'login' ? 'w-16 h-16' : 'w-15 h-15';

  return (
    <div className={`${sizeClassName} rounded-md border border-brand-action/60 bg-brand-action/10 flex items-center justify-center shrink-0 ${className}`}>
            <svg width="40" height="40" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="3" width="6" height="6" rx="1" fill="#E76F2E" />
              <rect x="11" y="3" width="6" height="6" rx="1" fill="#E76F2E" fillOpacity="0.42" />
              <rect x="3" y="11" width="6" height="6" rx="1" fill="#E76F2E" fillOpacity="0.42" />
              <rect x="11" y="11" width="6" height="6" rx="1" fill="#E76F2E" />
              {/* green check badge */}
              <circle cx="15" cy="15" r="5" fill="#111110" stroke="#55A982" strokeWidth="0.8" />
              <path d="M12.5 15l1.5 1.5 2.5-2.5" stroke="#55A982" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
  );
}
