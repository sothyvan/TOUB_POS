export default function Logo({ variant = 'topbar', className = '' }) {
  if (variant === 'login') {
    return (
      <div className={`w-14 h-14 rounded-xl bg-[#1a1a1a] text-brand-yellow grid place-items-center text-3xl font-black shadow-[inset_0_-3px_0_rgba(255,255,255,0.06)] shrink-0 ${className}`}>
        T
      </div>
    );
  }

  return (
    <div className={`w-11 h-11 rounded-lg bg-[#23211f] text-[#f8d36b] grid place-items-center text-2xl font-extrabold shadow-[inset_0_-4px_0_rgba(255,255,255,0.08)] shrink-0 ${className}`}>
      T
    </div>
  );
}
