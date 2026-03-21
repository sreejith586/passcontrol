import { cn } from '@/lib/cn';
import { Skeleton } from '../Skeleton';
import { EmptyState } from '@/shared/layout/EmptyState';
import type { DataTableColumn } from './types';

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: string[]) => void;
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  getRowClassName?: (row: T) => string;
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data',
  emptyDescription,
  emptyAction,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  getRowId,
  onRowClick,
  getRowClassName,
}: DataTableProps<T>) {
  const allSelected = data.length > 0 && data.every((r) => selectedIds.has(getRowId(r)));
  const someSelected = data.some((r) => selectedIds.has(getRowId(r)));

  function handleSelectAll(checked: boolean) {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange(data.map(getRowId));
    } else {
      onSelectionChange([]);
    }
  }

  function handleSelectRow(row: T, checked: boolean) {
    if (!onSelectionChange) return;
    const id = getRowId(row);
    const next = new Set(selectedIds);
    if (checked) next.add(id);
    else next.delete(id);
    onSelectionChange(Array.from(next));
  }

  if (loading) {
    return (
      <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              {selectable && (
                <th className="w-12 px-4 py-3 text-left">
                  <Skeleton className="h-4 w-4" />
                </th>
              )}
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left font-medium" style={{ width: col.width }}>
                  <Skeleton className="h-4 w-24" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="border-b border-slate-100">
                {selectable && (
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-4" />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyMessage}
        description={emptyDescription}
        action={emptyAction}
        className="min-h-[200px]"
      />
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80">
            {selectable && (
              <th className="w-12 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => el && (el.indeterminate = someSelected && !allSelected)}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left font-medium text-foreground"
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const id = getRowId(row);
            const isSelected = selectedIds.has(id);
            return (
              <tr
                key={id}
                className={cn(
                  'border-b border-slate-100 transition-colors hover:bg-slate-50/80',
                  onRowClick && 'cursor-pointer',
                  getRowClassName?.(row)
                )}
                onClick={() => onRowClick?.(row)}
              >
                {selectable && (
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleSelectRow(row, e.target.checked)}
                      className="h-4 w-4 rounded border-border"
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-foreground">
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
