import { forwardRef } from 'react';
import type { CSSProperties, SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

// Data-URI chevron for nativeSelectArrowStyle (single source; no duplicate SVGs elsewhere).
const nativeSelectArrowDataUrl =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")";

/** Inline background for the chevron; pair with nativeSelectControlClassName or NativeSelect. */
export const nativeSelectArrowStyle: CSSProperties = {
  backgroundImage: nativeSelectArrowDataUrl,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.5rem center',
  backgroundSize: '16px',
};

// appearance-none + [-webkit-appearance:none]: remove OS chrome so our border, radius, and
// background chevron render consistently (Safari especially shows a broken mix otherwise).
const nativeSelectShellClassName =
  'rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm leading-5 text-foreground appearance-none [-webkit-appearance:none] focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 disabled:cursor-not-allowed disabled:opacity-50';

const nativeSelectSizeFilterClassName = 'h-9 min-h-[2.25rem]';
const nativeSelectSizeFormClassName = 'h-10 min-h-[2.5rem]';

export const nativeSelectControlClassName = cn(
  nativeSelectShellClassName,
  nativeSelectSizeFilterClassName
);

export interface NativeSelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** When false, width stays intrinsic (inline toolbars). Default true. */
  fullWidth?: boolean;
  /**
   * filter — h-9, matches FilterBar (default).
   * form — h-10, aligns with Input when a select and text field share a row (e.g. sm:grid-cols-2).
   */
  sizeVariant?: 'filter' | 'form';
}

export const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  (
    { className, style, fullWidth = true, sizeVariant = 'filter', ...props },
    ref
  ) => (
    <select
      ref={ref}
      className={cn(
        nativeSelectShellClassName,
        sizeVariant === 'form'
          ? nativeSelectSizeFormClassName
          : nativeSelectSizeFilterClassName,
        fullWidth && 'w-full min-w-0',
        className
      )}
      style={{ ...nativeSelectArrowStyle, ...style }}
      {...props}
    />
  )
);

NativeSelect.displayName = 'NativeSelect';
