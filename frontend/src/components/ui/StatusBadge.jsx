export default function StatusBadge({ active, activeLabel, inactiveLabel, className = '' }) {
  const baseClass = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border";
  
  if (active) {
    return (
      <span className={`${baseClass} bg-[#e6f4eb] text-[#126149] border-[#b9dec9] ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#19a86f]" />
        {activeLabel}
      </span>
    );
  }

  return (
    <span className={`${baseClass} bg-gray-100 text-gray-500 border-gray-200 ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
      {inactiveLabel}
    </span>
  );
}
