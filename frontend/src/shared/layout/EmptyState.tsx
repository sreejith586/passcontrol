import { cn } from '@/lib/cn';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-white px-6 py-10 text-center sm:px-8 sm:py-12',
        className
      )}
    >
      {icon && (
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted/70 text-muted-foreground [&>svg]:h-[1.35rem] [&>svg]:w-[1.35rem]"
          aria-hidden
        >
          {icon}
        </div>
      )}
      <div className="max-w-sm space-y-1.5">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}
