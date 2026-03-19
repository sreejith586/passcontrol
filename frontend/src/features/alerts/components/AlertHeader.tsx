import type { AlertEvent } from '../types';
import { StatusBadge } from './StatusBadge';
import { SeverityBadge } from './SeverityBadge';
import { formatDateTime } from '@/lib/date';

interface AlertHeaderProps {
  alert: AlertEvent;
}

export function AlertHeader({ alert }: AlertHeaderProps) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center gap-4">
        <StatusBadge status={alert.status} />
        <SeverityBadge severity={alert.severity} />
        <span className="text-sm text-muted-foreground">
          Triggered {formatDateTime(alert.triggeredAt)}
        </span>
        {alert.assignedToUserId && (
          <span className="text-sm">
            Assigned to:{' '}
            <span className="font-medium">
              {alert.assignedToUser?.name ?? 'Unknown user'}
            </span>
          </span>
        )}
      </div>
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <span className="text-muted-foreground">Source:</span>{' '}
          {alert.sourceType} / {alert.sourceId.slice(0, 8)}…
        </div>
        <div>
          <span className="text-muted-foreground">SLA:</span> Ack within{' '}
          {alert.acknowledgeWithinMinutes}m, resolve within{' '}
          {alert.resolveWithinMinutes}m
        </div>
      </div>
    </div>
  );
}
