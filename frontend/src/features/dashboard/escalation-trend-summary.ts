import type { EscalationTrendPoint } from './types';

/**
 * Single-line insight from 7-day escalation trend.
 * Trend API only exposes total triggered per day vs count still in open SLA breach that day.
 */
export function computeEscalationTrendSummary(points: EscalationTrendPoint[]): string {
  if (!points.length) {
    return 'No alerts triggered in this window.';
  }

  const totalAlerts = points.reduce((s, p) => s + p.totalAlerts, 0);
  if (totalAlerts === 0) {
    return 'No alerts triggered in this window.';
  }

  const totalBreached = points.reduce((s, p) => s + p.breachedAlerts, 0);
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const n = sorted.length;
  const mid = Math.max(1, Math.floor(n / 2));
  const earlier = sorted.slice(0, mid);
  const later = sorted.slice(mid);
  const breachEarlier = earlier.reduce((s, p) => s + p.breachedAlerts, 0);
  const breachLater = later.reduce((s, p) => s + p.breachedAlerts, 0);

  if (breachLater > breachEarlier && breachLater > 0) {
    return 'Open SLA pressure is higher in more recent days than earlier this week.';
  }
  if (breachEarlier > breachLater && breachEarlier > 0 && breachLater === 0) {
    return 'Recent days show less open SLA pressure than earlier in the week.';
  }

  const breachRatio = totalBreached / totalAlerts;
  if (breachRatio > 0.35) {
    return 'A large share of triggered alerts still show open acknowledge or resolve deadline pressure.';
  }
  if (breachRatio < 0.12 && totalAlerts >= 5) {
    return 'Most triggered alerts are on track or cleared without lingering open breaches.';
  }

  return 'Daily mix of newly triggered alerts vs those still past an SLA deadline.';
}
