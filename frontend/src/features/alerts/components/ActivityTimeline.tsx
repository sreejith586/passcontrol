import type { AlertEventActivity } from '../types';
import { formatDateTime } from '@/lib/date';
import { EmptyState } from '@/shared/layout/EmptyState';
import { cn } from '@/lib/cn';

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

const SECTION_CLASS = 'rounded-lg border border-border bg-muted/30 p-4';

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className={cn(SECTION_CLASS, 'space-y-4')}>
        <h3 className="font-medium text-foreground">Activity</h3>
        <EmptyState
          title="No activity yet"
          description="Acknowledge, resolve, or assign to log activity."
          className="p-6"
        />
      </div>
    );
  }

  return (
    <div className={cn(SECTION_CLASS, 'space-y-4')}>
      <h3 className="font-medium text-foreground">Activity</h3>
      <div className="relative">
        {/* Vertical line – centered in 24px timeline column */}
        <div
          className="absolute left-[11px] top-0 bottom-0 w-px bg-border"
          aria-hidden
        />
        <ul className="space-y-4 pl-6">
          {activities.map((activity) => (
            <li key={activity.id} className="relative pl-4">
              {/* Dot – centered on line at 12px from container */}
              <div
                className="absolute left-[-17px] top-2 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background"
                aria-hidden
              />
              {/* Content */}
              <div className="min-w-0 rounded-md border border-border bg-background/50 p-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-foreground">
                    {ACTIVITY_LABELS[activity.type] ?? activity.type}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(activity.createdAt)}
                  </span>
                </div>
                {activity.comment && (
                  <p className="mt-2 text-muted-foreground">{activity.comment}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
