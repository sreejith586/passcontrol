import { cn } from '@/lib/cn';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'outline';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        {
          'bg-primary/10 text-primary': variant === 'default',
          'bg-green-500/10 text-green-700 dark:text-green-400': variant === 'success',
          'bg-amber-500/10 text-amber-700 dark:text-amber-400': variant === 'warning',
          'bg-destructive/10 text-destructive': variant === 'destructive',
          'border border-border bg-transparent': variant === 'outline',
        },
        className
      )}
      {...props}
    />
  );
}
