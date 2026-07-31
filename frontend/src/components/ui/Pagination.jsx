import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Compact pager: previous/next plus a page indicator, rather than a full
 * numbered range, since task lists change in real time via the indexer and
 * numbered pages would drift under the user as new tasks land.
 */
export default function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.pages <= 1) return null;

  const { page, pages, total } = pagination;
  const canPrev = page > 1;
  const canNext = page < pages;

  return (
    <nav
      className="flex items-center justify-between gap-4 border-t border-white/[0.06] pt-4"
      aria-label="Pagination"
    >
      <p className="text-xs text-mist-dim">
        Page <span className="text-mist">{page}</span> of {pages} · {total} total
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => canPrev && onPageChange(page - 1)}
          disabled={!canPrev}
          className="btn-secondary py-1.5 px-3 text-xs"
          aria-label="Previous page"
        >
          <ChevronLeft size={14} aria-hidden="true" /> Prev
        </button>
        <button
          type="button"
          onClick={() => canNext && onPageChange(page + 1)}
          disabled={!canNext}
          className="btn-secondary py-1.5 px-3 text-xs"
          aria-label="Next page"
        >
          Next <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
