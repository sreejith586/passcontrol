import type { AlertEventActivity } from '../types';
import { formatDateTime } from '@/lib/date';
import { EmptyState } from '@/shared/layout/EmptyState';
import { Card } from '@/shared/ui/Card';

interface ActivityTimelineProps {
  activities: AlertEventActivity[];
}

const ACTIVITY_LABELS: Record<string, string> = {
  CREATED: 'Alert created',
  ACKNOWLEDGED: 'Acknowledged',
  RESOLVED: 'Resolved',
  ASSIGNED: 'Assigned',
  UNASSIGNED: 'Unassigned',
  REASSIGNED: 'Reassigned',
  REOPENED: 'Reopened',
};

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <Card variant="soft" className="space-y-4 p-5">
        <h3 className="text-base font-semibold text-slate-900">Activity timeline</h3>
        <EmptyState
          title="No activity yet"
          description="Acknowledge, resolve, or assign to log activity."
          className="p-6"
        />
      </Card>
    );
  }

  return (
    <Card variant="soft" className="space-y-4 p-5">
      <h3 className="text-base font-semibold text-slate-900">Activity timeline</h3>
      <div className="relative">
        {/* Vertical line */}
        <div
          className="absolute left-[11px] top-0 bottom-0 w-px bg-slate-200"
          aria-hidden
        />
        <ul className="space-y-4 pl-6">
          {activities.map((activity) => (
            <li key={activity.id} className="relative pl-4">
              {/* Dot */}
              <div
                className="absolute left-[-17px] top-2.5 h-2.5 w-2.5 rounded-full border-2 border-sky-500 bg-white shadow-sm"
                aria-hidden
              />
              {/* Content */}
              <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm shadow-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold text-slate-900">
                    {ACTIVITY_LABELS[activity.type] ?? activity.type}
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {formatDateTime(activity.createdAt)}
                  </span>
                </div>
                {activity.comment && (
                  <p className="mt-2 text-slate-600">{activity.comment}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
