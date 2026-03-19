import { Badge } from '@/shared/ui/Badge';
import type { AlertStatus } from '../types';

const STATUS_LABELS: Record<AlertStatus, string> = {
  OPEN: 'Open',
  ACKNOWLEDGED: 'Acknowledged',
  RESOLVED: 'Resolved',
};

interface StatusBadgeProps {
  status: AlertStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variant =
    status === 'OPEN'
      ? 'destructive'
      : status === 'ACKNOWLEDGED'
        ? 'warning'
        : 'success';
  return <Badge variant={variant}>{STATUS_LABELS[status] ?? status}</Badge>;
}
