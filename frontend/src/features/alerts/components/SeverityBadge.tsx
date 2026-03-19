import { Badge } from '@/shared/ui/Badge';
import { cn } from '@/lib/cn';

export const SEVERITY_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  CRITICAL: {
    label: 'Critical',
    className: 'bg-destructive/10 text-destructive',
  },
  HIGH: {
    label: 'High',
    className: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  },
  MEDIUM: {
    label: 'Medium',
    className: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  },
  LOW: {
    label: 'Low',
    className: 'border border-border bg-muted/50 text-muted-foreground',
  },
};

export function getSeverityLabel(severity: string | null): string {
  if (!severity) return '—';
  return SEVERITY_CONFIG[severity]?.label ?? severity;
}

interface SeverityBadgeProps {
  severity: string | null;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  if (!severity) {
    return <Badge variant="outline">—</Badge>;
  }
  const config = SEVERITY_CONFIG[severity];
  if (!config) {
    return <Badge variant="outline">{severity}</Badge>;
  }
  return (
    <Badge
      variant="outline"
      className={cn('border-transparent', config.className)}
    >
      {config.label}
    </Badge>
  );
}
