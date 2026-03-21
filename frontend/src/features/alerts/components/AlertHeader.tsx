import type { AlertEvent } from '../types';
import { getSourceTypeLabel } from '@/lib/labels';
import { StatusBadge } from './StatusBadge';
import { SeverityBadge } from './SeverityBadge';
import { AssigneeBadge } from './AssigneeBadge';
import { formatDateTime, deriveSlaBreach } from '@/lib/date';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';

interface AlertHeaderProps {
  alert: AlertEvent;
}

export function AlertHeader({ alert }: AlertHeaderProps) {
  const { ackBreached, resolveBreached } = deriveSlaBreach(alert);

  return (
    <div className="space-y-4">
      {/* Primary summary – operational at a glance */}
      <Card variant="soft" className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={alert.status} />
          <SeverityBadge severity={alert.severity} />
          <AssigneeBadge
            assignedToUserId={alert.assignedToUserId}
            assignedToUser={alert.assignedToUser}
          />
          <span className="text-sm text-slate-500">
            Triggered {formatDateTime(alert.triggeredAt)}
          </span>
        </div>

        {/* SLA breach emphasis – only when breached */}
        {(ackBreached || resolveBreached) && (
          <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
            {ackBreached && (
              <Badge variant="destructive" className="text-xs font-medium">
                Ack SLA breached
              </Badge>
            )}
            {resolveBreached && (
              <Badge variant="destructive" className="text-xs font-medium">
                Resolve SLA breached
              </Badge>
            )}
          </div>
        )}

        {/* SLA and source – always visible */}
        <div className="grid gap-3 border-t border-slate-200 pt-4 text-sm sm:grid-cols-2">
          <div>
            <span className="text-slate-500">Source:</span>{' '}
            <span className="font-medium text-slate-900">{getSourceTypeLabel(alert.sourceType)}</span>
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
