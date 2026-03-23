import { NotificationType } from '@prisma/client';

export function getEmailSubject(type: NotificationType, payload: Record<string, unknown>): string {
  switch (type) {
    case 'ESCALATION_ASSIGNED':
      return `Escalation assigned to you: ${summarize(payload)}`;
    case 'ESCALATION_CREATED':
      return `New escalation: ${summarize(payload)}`;
    case 'ESCALATION_RESOLVED':
      return `Escalation resolved: ${summarize(payload)}`;
    case 'CHECKLIST_DUE_SOON':
      return `Checklist due soon: ${summarize(payload)}`;
    case 'CHECKLIST_OVERDUE':
      return `Checklist overdue: ${summarize(payload)}`;
    default:
      return `Notification: ${type}`;
  }
}

export function getEmailBody(type: NotificationType, payload: Record<string, unknown>): string {
  const summary = summarize(payload);
  const checklistName = String(
    payload.checklistName ?? payload.checklist_name ?? payload.scheduleName ?? '',
  );
  const itemLabel = String(payload.itemLabel ?? payload.item_label ?? '');
  const alertId = String(payload.alertEventId ?? payload.alert_event_id ?? payload.sourceId ?? payload.source_id ?? '');

  switch (type) {
    case 'ESCALATION_ASSIGNED':
      return `An escalation has been assigned to you.\n\n${summary}\n\nView alert: ${buildAppUrl(`/alerts/${alertId}`)}`;
    case 'ESCALATION_CREATED':
      return `A new escalation was created.\n\n${summary}\n\nView alert: ${buildAppUrl(`/alerts/${alertId}`)}`;
    case 'ESCALATION_RESOLVED':
      return `An escalation has been resolved.\n\n${summary}\n\nView alert: ${buildAppUrl(`/alerts/${alertId}`)}`;
    case 'CHECKLIST_DUE_SOON':
      return `A checklist is due soon.\n\n${checklistName || summary}\n${itemLabel ? `Item: ${itemLabel}\n` : ''}\nView: ${buildAppUrl('/checklist-runs')}`;
    case 'CHECKLIST_OVERDUE':
      return `A checklist is overdue.\n\n${checklistName || summary}\n${itemLabel ? `Item: ${itemLabel}\n` : ''}\nView: ${buildAppUrl('/checklist-runs')}`;
    default:
      return `${type}: ${summary}`;
  }
}

function summarize(payload: Record<string, unknown>): string {
  const checklistName =
    payload.checklistName ??
    payload.checklist_name ??
    payload.checklistRunName ??
    payload.scheduleName ??
    '';
  const itemLabel = payload.itemLabel ?? payload.item_label ?? '';
  const severity = payload.severity ?? '';
  const parts = [];
  if (checklistName) parts.push(String(checklistName));
  if (itemLabel) parts.push(String(itemLabel));
  if (severity) parts.push(`(${severity})`);
  return parts.length > 0 ? parts.join(' ') : 'Notification';
}

function buildAppUrl(path: string): string {
  const base = process.env.APP_BASE_URL ?? 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}
