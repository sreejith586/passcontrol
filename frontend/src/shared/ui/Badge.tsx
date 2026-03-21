import { cn } from '@/lib/cn';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'outline';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        {
          'bg-primary/10 text-primary': variant === 'default',
          'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400': variant === 'success',
          'bg-amber-500/15 text-amber-700 dark:text-amber-500': variant === 'warning',
          'bg-destructive/15 text-destructive': variant === 'destructive',
          'bg-sky-500/15 text-sky-700 dark:text-sky-400': variant === 'info',
          'border border-border bg-muted/30 text-muted-foreground': variant === 'outline',
        },
        className
      )}
      {...props}
    />
  );
}
