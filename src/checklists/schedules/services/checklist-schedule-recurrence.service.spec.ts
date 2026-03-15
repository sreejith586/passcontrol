import { ChecklistScheduleRecurrenceService } from './checklist-schedule-recurrence.service';

describe('ChecklistScheduleRecurrenceService', () => {
  let service: ChecklistScheduleRecurrenceService;

  beforeEach(() => {
    service = new ChecklistScheduleRecurrenceService();
  });

  describe('computeNextRunAt (timezone-aware)', () => {
    const schedule = {
      rrule: 'FREQ=DAILY;BYHOUR=6;BYMINUTE=0',
      timezone: 'America/New_York',
      startsAt: null as Date | null,
      endsAt: null as Date | null,
    };

    it('returns next occurrence at 6am in schedule timezone (America/New_York)', () => {
      // After 11am UTC March 15 2025 = 7am EDT; next 6am NY = March 16 6am EDT = 10am UTC
      const after = new Date('2025-03-15T11:00:00.000Z');
      const next = service.computeNextRunAt(schedule, after, {
        inclusive: false,
      });
      expect(next).not.toBeNull();
      expect(next!.toISOString()).toBe('2025-03-16T10:00:00.000Z');
    });

    it('inclusive=true returns same occurrence when after is exactly on it', () => {
      const occurrence = new Date('2025-03-16T10:00:00.000Z'); // 6am EDT
      const next = service.computeNextRunAt(schedule, occurrence, {
        inclusive: true,
      });
      expect(next).not.toBeNull();
      expect(next!.toISOString()).toBe('2025-03-16T10:00:00.000Z');
    });

    it('inclusive=false advances to next occurrence when after is exactly on it', () => {
      const occurrence = new Date('2025-03-16T10:00:00.000Z'); // 6am EDT
      const next = service.computeNextRunAt(schedule, occurrence, {
        inclusive: false,
      });
      expect(next).not.toBeNull();
      expect(next!.toISOString()).toBe('2025-03-17T10:00:00.000Z');
    });
  });

  describe('startsAt and endsAt', () => {
    it('respects endsAt by returning null when next is after endsAt', () => {
      const schedule = {
        rrule: 'FREQ=DAILY;BYHOUR=6;BYMINUTE=0',
        timezone: 'America/New_York',
        startsAt: null as Date | null,
        endsAt: new Date('2025-03-16T09:00:00.000Z'),
      };
      const after = new Date('2025-03-15T11:00:00.000Z');
      const next = service.computeNextRunAt(schedule, after, {
        inclusive: false,
      });
      expect(next).toBeNull();
    });

    it('uses startsAt as anchor when in future', () => {
      const schedule = {
        rrule: 'FREQ=DAILY;BYHOUR=6;BYMINUTE=0',
        timezone: 'America/New_York',
        startsAt: new Date('2025-03-20T00:00:00.000Z'),
        endsAt: null as Date | null,
      };
      const after = new Date('2025-03-15T11:00:00.000Z');
      const next = service.computeNextRunAt(schedule, after);
      expect(next).not.toBeNull();
      expect(next!.getTime()).toBeGreaterThanOrEqual(
        new Date('2025-03-20T10:00:00.000Z').getTime(),
      );
    });
  });

  describe('DST-sensitive timezone', () => {
    it('handles America/New_York across DST boundary', () => {
      // Nov 2 2025: DST ends; 6am stays 6am local
      const schedule = {
        rrule: 'FREQ=DAILY;BYHOUR=6;BYMINUTE=0',
        timezone: 'America/New_York',
        startsAt: null,
        endsAt: null,
      };
      const after = new Date('2025-11-01T11:00:00.000Z'); // 7am EDT
      const next = service.computeNextRunAt(schedule, after, {
        inclusive: false,
      });
      expect(next).not.toBeNull();
      // Nov 2 6am EST = 11am UTC (after DST ends)
      expect(next!.getUTCDate()).toBe(2);
      expect(next!.getUTCMonth()).toBe(10);
      expect(next!.getUTCHours()).toBe(11);
    });
  });

  describe('invalid RRULE', () => {
    it('returns null for invalid rrule', () => {
      const schedule = {
        rrule: 'INVALID',
        timezone: 'America/New_York',
        startsAt: null,
        endsAt: null,
      };
      const next = service.computeNextRunAt(schedule, new Date());
      expect(next).toBeNull();
    });
  });
});
