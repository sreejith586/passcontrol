import type { AlertEvent } from '../types';
import { formatAlertSourceDisplay } from '@/lib/labels';
import { StatusBadge } from './StatusBadge';
import { SeverityBadge } from './SeverityBadge';
import { formatDateTime, deriveSlaBreach } from '@/lib/date';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';

interface AlertHeaderProps {
  alert: AlertEvent;
}

export function AlertHeader({ alert }: AlertHeaderProps) {
  const { ackBreached, resolveBreached } = deriveSlaBreach(alert);
  const { primary: sourcePrimary, secondary: sourceSecondary } = formatAlertSourceDisplay(alert);

  return (
    <div className="space-y-4">
      {/* Primary summary – operational at a glance */}
      <Card variant="soft" className="space-y-4 p-5">
        {/* Status, severity, assignment – prominent */}
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={alert.status} />
          <SeverityBadge severity={alert.severity} />
          {alert.assignedToUserId && (
            <span className="rounded-md bg-sky-100 px-2.5 py-1 text-sm font-semibold text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">
              Assigned: {alert.assignedToUser?.name ?? 'Unknown user'}
            </span>
          )}
          {!alert.assignedToUserId && (
            <span className="rounded-md border border-dashed border-slate-300 px-2.5 py-1 text-sm text-slate-500">
              Unassigned
            </span>
          )}
          <span className="text-sm text-slate-500">
            Triggered {formatDateTime(alert.triggeredAt)}
          </span>
        </div>

        {/* SLA breach – clearly highlighted */}
        {(ackBreached || resolveBreached) && (
          <div className="rounded-lg border-2 border-destructive bg-destructive/10 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-destructive">
              SLA breached
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {ackBreached && (
                <Badge variant="destructive" className="text-xs font-semibold">
                  Ack SLA breached
                </Badge>
              )}
              {resolveBreached && (
                <Badge variant="destructive" className="text-xs font-semibold">
                  Resolve SLA breached
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* SLA and source – always visible */}
        <div className="grid gap-3 border-t border-slate-200 pt-4 text-sm sm:grid-cols-2">
          <div>
            <span className="text-slate-500">Source:</span>{' '}
            <span className="font-semibold text-slate-900">{sourcePrimary}</span>
            {sourceSecondary && (
              <span className="mt-1 block text-slate-500">{sourceSecondary}</span>
            )}
          </div>
          <div>
            <span className="text-slate-500">SLA:</span>{' '}
            <span className="font-medium text-slate-700">
              Ack {alert.acknowledgeWithinMinutes}m, resolve {alert.resolveWithinMinutes}m
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
