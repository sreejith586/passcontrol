import { NotificationType } from '@prisma/client';

/**
 * All notification types that support user preferences.
 * Must stay in sync with NotificationType enum.
 */
export const PREFERENCE_SUPPORTED_TYPES: NotificationType[] = [
  'ESCALATION_ASSIGNED',
  'ESCALATION_CREATED',
  'ESCALATION_RESOLVED',
  'CHECKLIST_DUE_SOON',
  'CHECKLIST_OVERDUE',
];
