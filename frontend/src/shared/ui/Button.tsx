import { forwardRef } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  /** Shows spinner and disables the button; keeps layout stable for async actions. */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      disabled,
      loading = false,
      children,
      ...props
    },
    ref
  ) => {
    const isBusy = loading || disabled;
    return (
      <button
        ref={ref}
        disabled={isBusy}
        aria-busy={loading || undefined}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'primary',
            'border border-border bg-background hover:bg-muted': variant === 'secondary',
            'hover:bg-muted': variant === 'ghost',
            'bg-destructive text-destructive-foreground hover:bg-destructive/90': variant === 'danger',
          },
          {
            'h-8 px-3 text-sm': size === 'sm',
            'h-10 px-4 text-sm': size === 'md',
            'h-11 px-6 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {loading && (
          <Spinner
            size="sm"
            className={cn(
              'shrink-0',
              variant === 'primary' && '!border-t-primary-foreground',
              variant === 'danger' && '!border-t-destructive-foreground',
              (variant === 'secondary' || variant === 'ghost') && '!border-t-primary'
            )}
            aria-hidden
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
