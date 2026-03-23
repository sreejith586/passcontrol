import type { Notification } from './types';

function safeStr(val: unknown): string {
  if (val === undefined || val === null) return '';
  const s = String(val).trim();
  return s === 'undefined' || s === 'null' ? '' : s;
}

/**
 * Returns user-friendly main display text for a notification.
 * Uses payload fields when available; falls back to type-based copy.
 */
export function getNotificationDisplayText(n: Notification): string {
  const msg = n.payload?.message;
  if (typeof msg === 'string' && msg.trim()) return msg.trim();

  const name =
    safeStr(n.payload?.templateNameSnapshot) ||
    safeStr(n.payload?.scheduleName) ||
    safeStr(n.payload?.checklistName) ||
    safeStr(n.payload?.label) ||
    '';

  switch (n.type) {
    case 'ESCALATION_ASSIGNED':
      return name ? `Alert assigned to you: ${name}` : 'Alert assigned to you';
    case 'ESCALATION_CREATED':
      return name ? `New alert: ${name}` : 'New alert created';
    case 'ESCALATION_RESOLVED':
      return name ? `Alert resolved: ${name}` : 'Alert resolved';
    case 'CHECKLIST_DUE_SOON':
      return name ? `Checklist due soon: ${name}` : 'Checklist due soon';
    case 'CHECKLIST_OVERDUE':
      return name ? `Checklist overdue: ${name}` : 'Checklist overdue';
    default:
      return 'New notification';
  }
}

/**
 * Returns optional secondary detail (e.g. severity, item label).
 */
export function getNotificationDetailText(n: Notification): string | null {
  const severity = safeStr(n.payload?.severity);
  const itemLabel = safeStr(n.payload?.itemLabel) || safeStr(n.payload?.label);
  const dueAt = n.payload?.dueAt;
  const parts: string[] = [];
  if (severity) parts.push(severity);
  if (itemLabel) parts.push(itemLabel);
  if (dueAt && typeof dueAt === 'string') {
    try {
      const d = new Date(dueAt);
      if (!isNaN(d.getTime())) parts.push(`Due ${d.toLocaleDateString()}`);
    } catch {
      /* ignore */
    }
  }
  return parts.length > 0 ? parts.join(' • ') : null;
}

/**
 * Returns the URL to navigate when clicking a notification, or null if no route.
 */
export function getNotificationTargetUrl(n: Notification): string | null {
  if (n.sourceType === 'ALERT_EVENT' && n.sourceId) {
    return `/alerts/${n.sourceId}`;
  }
  if (n.sourceType === 'CHECKLIST_RUN' && n.sourceId) {
    return `/checklist-runs/${n.sourceId}`;
  }
  return null;
}
