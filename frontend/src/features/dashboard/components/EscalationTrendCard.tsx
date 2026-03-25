import { format } from 'date-fns';
import { Card } from '@/shared/ui/Card';
import type { EscalationTrendPoint } from '../types';
import { computeEscalationTrendSummary } from '../escalation-trend-summary';

interface EscalationTrendCardProps {
  points: EscalationTrendPoint[];
}

/**
 * Daily stacked bars: green = triggered that day with no open SLA deadline breach;
 * red = still past acknowledge or resolve deadline (per API semantics).
 * Does not split resolved-on-time vs resolved-late (not in trend payload).
 */
export function EscalationTrendCard({ points }: EscalationTrendCardProps) {
  const summary = computeEscalationTrendSummary(points);

  if (points.length === 0) {
    return (
      <Card variant="soft" className="space-y-4 p-5">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Alerts triggered (last 7 days)
          </h3>
          <p className="mt-2 text-sm text-slate-500">{summary}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="soft" className="space-y-4 p-5">
      <div>
        <h3 className="text-base font-semibold text-slate-900">
          Alerts triggered (last 7 days)
        </h3>
        <p className="mt-1.5 text-sm font-medium text-slate-700">{summary}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Red = still past an acknowledge or resolve deadline. Green = within deadlines or already
          cleared. Per-day resolved-late vs on-time is not available in this view.
        </p>
      </div>

      <div className="space-y-3">
        {points.map((point) => {
          const total = point.totalAlerts;
          const breached = point.breachedAlerts;
          const clear = Math.max(0, total - breached);
          const breachPct = total > 0 ? (breached / total) * 100 : 0;
          const clearPct = total > 0 ? (clear / total) * 100 : 0;

          return (
            <div key={point.date} className="flex items-center gap-3">
              <span className="w-[4.5rem] shrink-0 text-xs text-slate-600 tabular-nums">
                {format(new Date(point.date), 'MMM d')}
              </span>
              <div className="flex min-h-[1.25rem] flex-1 overflow-hidden rounded-md bg-slate-100">
                {total === 0 ? (
                  <div className="h-5 w-full bg-slate-100" title="No alerts" />
                ) : (
                  <>
                    {clear > 0 && (
                      <div
                        className="h-5 min-w-0 bg-emerald-600/85"
                        style={{ width: `${clearPct}%` }}
                        title={`On track or cleared: ${clear}`}
                      />
                    )}
                    {breached > 0 && (
                      <div
                        className="h-5 min-w-0 bg-red-600/90"
                        style={{ width: `${breachPct}%` }}
                        title={`Open SLA breach: ${breached}`}
                      />
                    )}
                  </>
                )}
              </div>
              <span className="w-10 shrink-0 text-right text-xs tabular-nums text-slate-500">
                {total}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
