import Icon from './Icon';

function buildPageRange(currentPage, totalPages, siblingCount = 1) {
  const range = [];
  const leftSibling = Math.max(currentPage - siblingCount, 1);
  const rightSibling = Math.min(currentPage + siblingCount, totalPages);

  const showLeftDots = leftSibling > 2;
  const showRightDots = rightSibling < totalPages - 1;

  if (!showLeftDots && showRightDots) {
    const leftRange = Array.from({ length: Math.min(3 + 2 * siblingCount, totalPages) }, (_, i) => i + 1);
    range.push(...leftRange, 'right-dots');
  } else if (showLeftDots && !showRightDots) {
    const rightRange = Array.from({ length: Math.min(3 + 2 * siblingCount, totalPages) }, (_, i) => totalPages - (3 + 2 * siblingCount) + i + 1).filter((n) => n > 0);
    range.push('left-dots', ...rightRange);
  } else if (showLeftDots && showRightDots) {
    const middleRange = Array.from({ length: rightSibling - leftSibling + 1 }, (_, i) => leftSibling + i);
    range.push('left-dots', ...middleRange, 'right-dots');
  } else {
    const allPages = Array.from({ length: totalPages }, (_, i) => i + 1);
    range.push(...allPages);
  }

  return range;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  className = '',
}) {
  if (totalPages <= 1) return null;

  const pages = buildPageRange(currentPage, totalPages, siblingCount);

  return (
    <nav
      aria-label="Pagination"
      className={`flex items-center justify-center gap-1.5 ${className}`}
    >
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="Previous page"
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-brand-border bg-white text-brand-text text-sm font-bold transition-all cursor-pointer active:scale-95 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
      >
        <Icon name="chevronLeft" className="w-4 h-4" />
      </button>

      {pages.map((page) => {
        if (page === 'left-dots' || page === 'right-dots') {
          return (
            <span
              key={page}
              className="inline-flex h-10 min-w-10 items-center justify-center px-1 text-xs font-bold text-gray-400"
              aria-hidden="true"
            >
              ...
            </span>
          );
        }

        const isActive = page === currentPage;
        return (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            aria-label={`Page ${page}`}
            aria-current={isActive ? 'page' : undefined}
            className={`inline-flex h-10 min-w-10 items-center justify-center rounded-lg border text-xs font-bold transition-all cursor-pointer active:scale-95 ${
              isActive
                ? 'border-brand-action bg-brand-action text-white shadow-sm'
                : 'border-brand-border bg-white text-brand-text hover:bg-gray-50'
            }`}
          >
            {page}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="Next page"
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-brand-border bg-white text-brand-text text-sm font-bold transition-all cursor-pointer active:scale-95 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
      >
        <Icon name="chevronRight" className="w-4 h-4" />
      </button>
    </nav>
  );
}
