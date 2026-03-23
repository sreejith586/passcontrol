import { NotificationType } from '@prisma/client';

const BRAND_PREFIX = '[PassControl]';

function safeStr(val: unknown): string {
  if (val === undefined || val === null) return '';
  const s = String(val).trim();
  return s === 'undefined' || s === 'null' ? '' : s;
}

function safeId(val: unknown): string {
  const s = safeStr(val);
  return s && /^[a-f0-9-]{36}$/i.test(s) ? s : '';
}

export function getEmailSubject(type: NotificationType, payload: Record<string, unknown>): string {
  const summary = summarizeForSubject(payload);
  switch (type) {
    case 'ESCALATION_ASSIGNED':
      return summary ? `${BRAND_PREFIX} Escalation assigned to you — ${summary}` : `${BRAND_PREFIX} Escalation assigned to you`;
    case 'ESCALATION_CREATED':
      return summary ? `${BRAND_PREFIX} New escalation created — ${summary}` : `${BRAND_PREFIX} New escalation created`;
    case 'ESCALATION_RESOLVED':
      return summary ? `${BRAND_PREFIX} Escalation resolved — ${summary}` : `${BRAND_PREFIX} Escalation resolved`;
    case 'CHECKLIST_DUE_SOON':
      return summary ? `${BRAND_PREFIX} Checklist due soon — ${summary}` : `${BRAND_PREFIX} Checklist due soon`;
    case 'CHECKLIST_OVERDUE':
      return summary ? `${BRAND_PREFIX} Checklist overdue — ${summary}` : `${BRAND_PREFIX} Checklist overdue`;
    default:
      return `${BRAND_PREFIX} Notification`;
  }
}

function summarizeForSubject(payload: Record<string, unknown>): string {
  const name =
    safeStr(payload.templateNameSnapshot) ||
    safeStr(payload.scheduleName) ||
    safeStr(payload.checklistName) ||
    safeStr(payload.checklist_name) ||
    safeStr(payload.label) ||
    '';
  const severity = safeStr(payload.severity);
  const parts = name ? [name] : [];
  if (severity) parts.push(`(${severity})`);
  return parts.join(' ').slice(0, 60) || '';
}

export function getEmailBody(type: NotificationType, payload: Record<string, unknown>): string {
  const details = buildDetailsBlock(payload);
  const alertId = safeId(payload.alertEventId) || safeId(payload.alert_event_id) || safeId(payload.sourceId);
  const runId = safeId(payload.runId) || safeId(payload.sourceId);

  switch (type) {
    case 'ESCALATION_ASSIGNED':
      return buildBody({
        title: 'Escalation assigned to you',
        context: 'An alert has been assigned to you and needs your attention.',
        details,
        actionUrl: alertId ? buildAppUrl(`/alerts/${alertId}`) : buildAppUrl('/alerts'),
        actionLabel: 'View alert',
      });
    case 'ESCALATION_CREATED':
      return buildBody({
        title: 'New escalation created',
        context: 'A new alert has been created and may need action.',
        details,
        actionUrl: alertId ? buildAppUrl(`/alerts/${alertId}`) : buildAppUrl('/alerts'),
        actionLabel: 'View alert',
      });
    case 'ESCALATION_RESOLVED':
      return buildBody({
        title: 'Escalation resolved',
        context: 'An alert has been marked as resolved.',
        details,
        actionUrl: alertId ? buildAppUrl(`/alerts/${alertId}`) : buildAppUrl('/alerts'),
        actionLabel: 'View alert',
      });
    case 'CHECKLIST_DUE_SOON':
      return buildBody({
        title: 'Checklist due soon',
        context: 'A checklist run is coming due and may need your attention.',
        details,
        actionUrl: runId ? buildAppUrl(`/checklist-runs/${runId}`) : buildAppUrl('/checklist-runs'),
        actionLabel: 'View checklist run',
      });
    case 'CHECKLIST_OVERDUE':
      return buildBody({
        title: 'Checklist overdue',
        context: 'A checklist run is overdue and needs completion.',
        details,
        actionUrl: runId ? buildAppUrl(`/checklist-runs/${runId}`) : buildAppUrl('/checklist-runs'),
        actionLabel: 'View checklist run',
      });
    default:
      return buildBody({
        title: 'Notification',
        context: 'You have a new notification.',
        details: summarizeForSubject(payload) || 'No additional details.',
        actionUrl: buildAppUrl('/dashboard'),
        actionLabel: 'Open PassControl',
      });
  }
}

interface BodyParts {
  title: string;
  context: string;
  details: string;
  actionUrl: string;
  actionLabel: string;
}

function buildBody({ title, context, details, actionUrl, actionLabel }: BodyParts): string {
  const lines: string[] = [
    title,
    '',
    context,
    '',
  ];
  if (details) {
    lines.push('Details:', details, '');
  }
  lines.push(actionLabel + ':', actionUrl, '');
  lines.push('—');
  lines.push('PassControl');
  return lines.join('\n');
}

function buildDetailsBlock(payload: Record<string, unknown>): string {
  const parts: string[] = [];
  const name =
    safeStr(payload.templateNameSnapshot) ||
    safeStr(payload.scheduleName) ||
    safeStr(payload.checklistName) ||
    safeStr(payload.label);
  if (name) parts.push(`Checklist: ${name}`);
  const itemLabel = safeStr(payload.itemLabel) || safeStr(payload.item_label);
  if (itemLabel) parts.push(`Item: ${itemLabel}`);
  const severity = safeStr(payload.severity);
  if (severity) parts.push(`Severity: ${severity}`);
  const dueAt = payload.dueAt;
  if (dueAt && typeof dueAt === 'string') {
    try {
      const d = new Date(dueAt);
      if (!isNaN(d.getTime())) parts.push(`Due: ${d.toLocaleString()}`);
    } catch {
      /* ignore */
    }
  }
  return parts.length > 0 ? parts.join('\n') : '';
}

function buildAppUrl(path: string): string {
  const base = process.env.APP_BASE_URL ?? 'http://localhost:3000';
  const cleanBase = base.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}
