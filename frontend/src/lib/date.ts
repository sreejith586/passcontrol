import { format, formatDistanceToNow, addMinutes, isPast } from 'date-fns';

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy HH:mm');
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy');
}

export function formatTime(date: string | Date): string {
  return format(new Date(date), 'HH:mm');
}

export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

/** Format date for list rows: time when today, full date otherwise. */
export function formatDateTimeContextual(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (isToday) {
    return format(d, 'HH:mm');
  }
  return format(d, 'MMM d HH:mm');
}

/** Derive SLA breach flags from alert data. Frontend-only; no backend. */
export function deriveSlaBreach(alert: {
  triggeredAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  status: string;
  acknowledgeWithinMinutes: number;
  resolveWithinMinutes: number;
}): { ackBreached: boolean; resolveBreached: boolean } {
  const triggered = new Date(alert.triggeredAt);
  const ackBy = addMinutes(triggered, alert.acknowledgeWithinMinutes);
  const resolveBy = addMinutes(triggered, alert.resolveWithinMinutes);

  const ackBreached =
    alert.status !== 'RESOLVED' && !alert.acknowledgedAt && isPast(ackBy);
  const resolveBreached =
    alert.status !== 'RESOLVED' && !alert.resolvedAt && isPast(resolveBy);

  return { ackBreached, resolveBreached };
}
