/**
 * Format age from a past date as compact human-readable string.
 * Examples: 14m, 3h 22m, 1d 4h
 */
export function formatAge(createdAt: string | Date): string {
  const then = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) {
    const mins = diffMins % 60;
    return mins > 0 ? `${diffHours}h ${mins}m` : `${diffHours}h`;
  }
  const hours = diffHours % 24;
  return hours > 0 ? `${diffDays}d ${hours}h` : `${diffDays}d`;
}
