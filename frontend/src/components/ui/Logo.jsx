export default function Logo({ variant = 'topbar', className = '' }) {
  const sizeClassName = variant === 'login' ? 'w-16 h-16' : 'w-15 h-15';

  return (
    <div className={`${sizeClassName} rounded-[10px] bg-[#003ec7] flex items-center justify-center shrink-0 ${className}`}>
            <svg width="40" height="40" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="3" width="6" height="6" rx="1.5" fill="white" />
              <rect x="11" y="3" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.5" />
              <rect x="3" y="11" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.5" />
              <rect x="11" y="11" width="6" height="6" rx="1.5" fill="white" />
              {/* green check badge */}
              <circle cx="15" cy="15" r="5" fill="#16a34a" />
              <path d="M12.5 15l1.5 1.5 2.5-2.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
  );
}
