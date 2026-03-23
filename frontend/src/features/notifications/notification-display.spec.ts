import {
  getNotificationDisplayText,
  getNotificationDetailText,
  getNotificationTargetUrl,
} from './notification-display';
import type { Notification } from './types';

function mockNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n1',
    type: 'ESCALATION_ASSIGNED',
    sourceType: 'ALERT_EVENT',
    sourceId: 'alert-1',
    payload: {},
    createdAt: new Date().toISOString(),
    readAt: null,
    ...overrides,
  };
}

describe('notification-display', () => {
  describe('getNotificationDisplayText', () => {
    it('uses payload.message when present', () => {
      const n = mockNotification({ payload: { message: 'Custom message' } });
      expect(getNotificationDisplayText(n)).toBe('Custom message');
    });

    it('uses payload fields for richer display', () => {
      const n = mockNotification({
        type: 'ESCALATION_ASSIGNED',
        payload: { templateNameSnapshot: 'Daily Safety' },
      });
      expect(getNotificationDisplayText(n)).toBe('Alert assigned to you: Daily Safety');
    });

    it('handles all notification types with fallback', () => {
      expect(getNotificationDisplayText(mockNotification({ type: 'ESCALATION_ASSIGNED' }))).toBe(
        'Alert assigned to you'
      );
      expect(getNotificationDisplayText(mockNotification({ type: 'ESCALATION_CREATED' }))).toBe(
        'New alert created'
      );
      expect(getNotificationDisplayText(mockNotification({ type: 'ESCALATION_RESOLVED' }))).toBe(
        'Alert resolved'
      );
      expect(getNotificationDisplayText(mockNotification({ type: 'CHECKLIST_DUE_SOON' }))).toBe(
        'Checklist due soon'
      );
      expect(getNotificationDisplayText(mockNotification({ type: 'CHECKLIST_OVERDUE' }))).toBe(
        'Checklist overdue'
      );
    });

    it('handles CHECKLIST types with scheduleName', () => {
      const n = mockNotification({
        type: 'CHECKLIST_DUE_SOON',
        payload: { scheduleName: 'Morning Walkthrough' },
      });
      expect(getNotificationDisplayText(n)).toBe('Checklist due soon: Morning Walkthrough');
    });
  });

  describe('getNotificationDetailText', () => {
    it('returns null for empty payload', () => {
      expect(getNotificationDetailText(mockNotification())).toBeNull();
    });

    it('returns severity when present', () => {
      const n = mockNotification({ payload: { severity: 'HIGH' } });
      expect(getNotificationDetailText(n)).toBe('HIGH');
    });

    it('combines severity and item label', () => {
      const n = mockNotification({ payload: { severity: 'CRITICAL', itemLabel: 'Temperature check' } });
      expect(getNotificationDetailText(n)).toContain('CRITICAL');
      expect(getNotificationDetailText(n)).toContain('Temperature check');
    });
  });

  describe('getNotificationTargetUrl', () => {
    it('returns /alerts/:id for ALERT_EVENT', () => {
      const n = mockNotification({ sourceType: 'ALERT_EVENT', sourceId: 'alert-123' });
      expect(getNotificationTargetUrl(n)).toBe('/alerts/alert-123');
    });

    it('returns /checklist-runs/:id for CHECKLIST_RUN', () => {
      const n = mockNotification({ sourceType: 'CHECKLIST_RUN', sourceId: 'run-456' });
      expect(getNotificationTargetUrl(n)).toBe('/checklist-runs/run-456');
    });

    it('returns null for missing sourceId', () => {
      const n = mockNotification({ sourceType: 'ALERT_EVENT', sourceId: '' });
      expect(getNotificationTargetUrl(n)).toBeNull();
    });
  });
});
