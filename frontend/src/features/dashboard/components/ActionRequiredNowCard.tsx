import { Link } from 'react-router-dom';
import type { EscalationItem } from '@/features/escalations/types';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/layout/EmptyState';
import { SeverityBadge } from '@/features/alerts/components/SeverityBadge';
import { StatusBadge } from '@/features/alerts/components/StatusBadge';
import { getSourceTypeLabel } from '@/lib/labels';
import { cn } from '@/lib/cn';

const DISPLAY_LIMIT = 8;

function severitySortRank(severity: string | null | undefined): number {
  const s = (severity ?? '').toUpperCase();
  if (s === 'CRITICAL') return 0;
  if (s === 'HIGH') return 1;
  if (s === 'MEDIUM') return 2;
  if (s === 'LOW') return 3;
  return 4;
}

function statusSortRank(status: string): number {
  return status === 'OPEN' ? 0 : 1;
}

function breachSortRank(item: EscalationItem): number {
  const g = item.priority?.rankGroup;
  if (g === 'RESOLVE_BREACHED') return 0;
  if (g === 'ACKNOWLEDGE_BREACHED') return 1;
  return 2;
}

function maxOverdueMinutes(item: EscalationItem): number {
  const ack = item.sla.acknowledgeOverdueMinutes ?? 0;
  const res = item.sla.resolveOverdueMinutes ?? 0;
  return Math.max(ack, res);
}

/** Client-side sort: Critical → High → …; OPEN before ACK; resolve breach before ack breach; most overdue first. */
export function sortActionRequiredItems(items: EscalationItem[]): EscalationItem[] {
  return [...items].sort((a, b) => {
    const sev = severitySortRank(a.severity) - severitySortRank(b.severity);
    if (sev !== 0) return sev;
    const st = statusSortRank(a.status) - statusSortRank(b.status);
    if (st !== 0) return st;
    const br = breachSortRank(a) - breachSortRank(b);
    if (br !== 0) return br;
    return maxOverdueMinutes(b) - maxOverdueMinutes(a);
  });
}

function rowPrimaryLabel(item: EscalationItem): string {
  const label = item.itemLabel?.trim();
  if (label) return label;
  const name = item.checklistName?.trim();
  if (name) return name;
  return getSourceTypeLabel(item.sourceType);
}

function rowContextLine(item: EscalationItem): string | null {
  const parts = [item.brandName, item.locationName, item.zoneName]
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

function formatUrgency(item: EscalationItem): string | null {
  if (item.sla.resolveBreached && (item.sla.resolveOverdueMinutes ?? 0) > 0) {
    return formatOverdueDuration(item.sla.resolveOverdueMinutes!);
  }
  if (item.sla.acknowledgeBreached && (item.sla.acknowledgeOverdueMinutes ?? 0) > 0) {
    return formatOverdueDuration(item.sla.acknowledgeOverdueMinutes!);
  }

  const resolveBy = new Date(item.sla.resolveBy).getTime();
  const now = Date.now();
  const deltaMs = resolveBy - now;
  if (deltaMs <= 0) return 'Due now';
  const m = Math.ceil(deltaMs / 60000);
  if (m < 60) return `Due in ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `Due in ${h}h`;
  return `Due in ${Math.ceil(h / 24)}d`;
}

function formatOverdueDuration(minutes: number): string {
  if (minutes >= 1440) {
    const d = Math.floor(minutes / 1440);
    return `${d}d overdue`;
  }
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    return `${h}h overdue`;
  }
  return `${minutes}m overdue`;
}

interface ActionRequiredNowCardProps {
  items: EscalationItem[];
}

export function ActionRequiredNowCard({ items }: ActionRequiredNowCardProps) {
  const sorted = sortActionRequiredItems(items);
  const shown = sorted.slice(0, DISPLAY_LIMIT);

  return (
    <Card variant="soft" className="space-y-4 p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">Action required now</h3>
        <Link
          to="/escalations"
          className="shrink-0 text-sm font-medium text-primary hover:underline"
        >
          View all →
        </Link>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          title="Nothing urgent right now"
          description="No open or acknowledged alerts need attention in this list."
          action={
            <Link to="/escalations">
              <Button variant="secondary" size="sm">
                View escalations
              </Button>
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {shown.map((item) => {
            const ctx = rowContextLine(item);
            const urgency = formatUrgency(item);
            return (
              <li key={item.alertEventId}>
                <Link
                  to={`/alerts/${item.alertEventId}`}
                  className="flex flex-col gap-1.5 px-4 py-3 transition-colors hover:bg-slate-50 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={item.severity} />
                      <StatusBadge
                        status={item.status as 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'}
                      />
                      {urgency && (
                        <span
                          className={cn(
                            'text-xs font-medium tabular-nums',
                            item.sla.resolveBreached || item.sla.acknowledgeBreached
                              ? 'text-red-600'
                              : 'text-amber-700'
                          )}
                        >
                          {urgency}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm font-medium text-slate-900">
                      {rowPrimaryLabel(item)}
                    </p>
                    {ctx && (
                      <p className="truncate text-xs text-slate-500">{ctx}</p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
