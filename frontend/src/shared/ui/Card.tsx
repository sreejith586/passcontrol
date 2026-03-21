import { cn } from '@/lib/cn';

/** Standard card surface: rounded, soft border, clean workspace feel. */
const CARD_BASE = 'rounded-xl border border-slate-200 bg-white shadow-sm';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'soft';
}

export function Card({
  className,
  variant = 'default',
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        CARD_BASE,
        variant === 'soft' && 'bg-white border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
        className
      )}
      {...props}
    />
  );
}

/** Right-rail / context card: soft background, compact header. */
export function RailCard({
  title,
  className,
  children,
  ...props
}: {
  title: string;
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>) {
  return (
    <Card variant="soft" className={cn('p-4', className)} {...props}>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</h3>
      <div className="space-y-2 text-sm">{children}</div>
    </Card>
  );
}
