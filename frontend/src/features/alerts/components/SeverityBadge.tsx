import { Badge } from '@/shared/ui/Badge';

export const SEVERITY_CONFIG: Record<
  string,
  { label: string; variant: 'destructive' | 'warning' | 'outline' }
> = {
  CRITICAL: { label: 'Critical', variant: 'destructive' },
  HIGH: { label: 'High', variant: 'destructive' },
  MEDIUM: { label: 'Medium', variant: 'warning' },
  LOW: { label: 'Low', variant: 'outline' },
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
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
