import { Badge } from '@/shared/ui/Badge';

interface SeverityBadgeProps {
  severity: string | null;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  if (!severity) return <Badge variant="outline">—</Badge>;
  const variant =
    severity === 'CRITICAL'
      ? 'destructive'
      : severity === 'HIGH'
        ? 'destructive'
        : severity === 'MEDIUM'
          ? 'warning'
          : 'default';
  return <Badge variant={variant}>{severity}</Badge>;
}
