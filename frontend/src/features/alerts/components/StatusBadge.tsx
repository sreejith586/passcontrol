import { Badge } from '@/shared/ui/Badge';
import type { AlertStatus } from '../types';

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
  return <Badge variant={variant}>{status}</Badge>;
}
