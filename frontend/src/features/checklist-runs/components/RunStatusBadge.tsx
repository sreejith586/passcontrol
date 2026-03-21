import { Badge } from '@/shared/ui/Badge';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
};

interface RunStatusBadgeProps {
  status: string;
}

export function RunStatusBadge({ status }: RunStatusBadgeProps) {
  const variant =
    status === 'PENDING'
      ? 'outline'
      : status === 'IN_PROGRESS'
        ? 'warning'
        : 'success';
  return (
    <Badge variant={variant} className="font-bold">
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
