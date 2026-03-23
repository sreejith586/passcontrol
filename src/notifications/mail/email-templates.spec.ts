import { getEmailSubject, getEmailBody } from './email-templates';

const uuidPattern = /^[a-f0-9-]{36}$/i;

describe('email-templates', () => {
  describe('getEmailSubject', () => {
    it('prefixes all subjects with [PassControl]', () => {
      expect(getEmailSubject('ESCALATION_ASSIGNED', {})).toMatch(/^\[PassControl\]/);
      expect(getEmailSubject('ESCALATION_CREATED', {})).toMatch(/^\[PassControl\]/);
      expect(getEmailSubject('CHECKLIST_DUE_SOON', {})).toMatch(/^\[PassControl\]/);
    });

    it('uses consistent patterns per type', () => {
      expect(getEmailSubject('ESCALATION_ASSIGNED', {})).toBe('[PassControl] Escalation assigned to you');
      expect(getEmailSubject('ESCALATION_CREATED', {})).toBe('[PassControl] New escalation created');
      expect(getEmailSubject('ESCALATION_RESOLVED', {})).toBe('[PassControl] Escalation resolved');
    });

    it('appends summary when payload has details', () => {
      const subject = getEmailSubject('ESCALATION_ASSIGNED', {
        templateNameSnapshot: 'Daily Safety',
        severity: 'HIGH',
      });
      expect(subject).toContain('[PassControl]');
      expect(subject).toContain('Daily Safety');
      expect(subject).toContain('HIGH');
    });

    it('avoids undefined/null in subject', () => {
      expect(getEmailSubject('ESCALATION_ASSIGNED', { foo: undefined })).not.toContain('undefined');
      expect(getEmailSubject('ESCALATION_ASSIGNED', { foo: null })).not.toContain('null');
    });
  });

  describe('getEmailBody', () => {
    it('includes title and context for each type', () => {
      const body = getEmailBody('ESCALATION_ASSIGNED', {});
      expect(body).toContain('Escalation assigned to you');
      expect(body).toContain('assigned to you');
      expect(body).toContain('PassControl');
    });

    it('includes action link for ALERT_EVENT types', () => {
      const body = getEmailBody('ESCALATION_ASSIGNED', {
        alertEventId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      });
      expect(body).toContain('/alerts/');
      expect(body).toContain('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    });

    it('includes action link for CHECKLIST_RUN types', () => {
      const runId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const body = getEmailBody('CHECKLIST_DUE_SOON', { runId });
      expect(body).toContain('/checklist-runs/');
      expect(body).toContain(runId);
    });

    it('falls back to list URLs when ID missing', () => {
      const body = getEmailBody('ESCALATION_ASSIGNED', {});
      expect(body).toContain('/alerts');
      const checklistBody = getEmailBody('CHECKLIST_DUE_SOON', {});
      expect(checklistBody).toContain('/checklist-runs');
    });

    it('includes details block when payload has checklist/severity', () => {
      const body = getEmailBody('ESCALATION_ASSIGNED', {
        templateNameSnapshot: 'Daily',
        severity: 'CRITICAL',
      });
      expect(body).toContain('Details:');
      expect(body).toContain('Daily');
      expect(body).toContain('CRITICAL');
    });

    it('avoids undefined/null in body', () => {
      const body = getEmailBody('ESCALATION_ASSIGNED', { foo: undefined, bar: null });
      expect(body).not.toContain('undefined');
      expect(body).not.toContain('null');
    });

    it('does not produce broken links for invalid IDs', () => {
      const body = getEmailBody('ESCALATION_ASSIGNED', { alertEventId: 'not-a-uuid' });
      expect(body).not.toContain('/alerts/not-a-uuid');
      expect(body).toContain('/alerts');
    });
  });
});
