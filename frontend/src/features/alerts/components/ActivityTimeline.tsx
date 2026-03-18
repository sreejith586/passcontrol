import type { AlertEventActivity } from '../types';
import { formatDateTime } from '@/lib/date';
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

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No activity yet.</p>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-foreground">Activity</h3>
      <ul className="space-y-3">
        {activities.map((activity) => (
          <li
            key={activity.id}
            className={cn(
              'flex gap-3 rounded-md border border-border bg-muted/30 p-3 text-sm'
            )}
          >
            <div className="flex-1">
              <span className="font-medium">
                {ACTIVITY_LABELS[activity.type] ?? activity.type}
              </span>
              {activity.comment && (
                <p className="mt-1 text-muted-foreground">{activity.comment}</p>
              )}
            </div>
            <span className="shrink-0 text-muted-foreground">
              {formatDateTime(activity.createdAt)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
