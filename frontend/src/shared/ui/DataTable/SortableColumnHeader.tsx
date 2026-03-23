import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SortableColumnHeaderProps {
  label: string;
  sortKey: string;
  currentSort?: { sortBy: string; order: 'asc' | 'desc' };
  onSort: (sortBy: string, order: 'asc' | 'desc') => void;
  className?: string;
}

/**
 * Clickable column header for sortable columns.
 * Displays sort direction indicator when active.
 */
export function SortableColumnHeader({
  label,
  sortKey,
  currentSort,
  onSort,
  className,
}: SortableColumnHeaderProps) {
  const isActive = currentSort?.sortBy === sortKey;
  const order = isActive ? currentSort.order : 'desc';

  function handleClick() {
    onSort(sortKey, isActive && order === 'desc' ? 'asc' : 'desc');
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-1 font-medium text-foreground hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-1 rounded',
        className
      )}
      aria-sort={isActive ? (order === 'asc' ? 'ascending' : 'descending') : undefined}
    >
      {label}
      {isActive ? (
        order === 'asc' ? (
          <ChevronUp className="h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
        )
      ) : (
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground/40" aria-hidden />
      )}
    </button>
  );
}
