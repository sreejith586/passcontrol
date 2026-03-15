import { Injectable, Logger } from '@nestjs/common';
import { RRule, type Options } from 'rrule';
import { DateTime } from 'luxon';

/**
 * Input shape for computeNextRunAt. Matches ChecklistSchedule recurrence fields.
 */
export interface ScheduleLikeForRecurrence {
  rrule: string;
  timezone: string;
  startsAt?: Date | null;
  endsAt?: Date | null;
}

/**
 * Shared recurrence helper for checklist schedules.
 * Computes the next valid run time from RRULE + timezone + optional start/end window.
 *
 * Timezone handling:
 * - dtstart is built in the schedule timezone using Luxon
 * - tzid is passed to RRule so BYHOUR/BYMINUTE are interpreted in that timezone
 * - rrule returns "pseudo-UTC" (local time in tzid stored as UTC components);
 *   we normalize to true UTC using Luxon before returning
 *
 * startsAt: When present, used as the recurrence anchor. We interpret startsAt as
 * a UTC instant; the date part in the schedule timezone is used for dtstart.
 *
 * Production note: rrule with tzid has system-timezone-dependent behavior. For
 * correct results, run the process with TZ=UTC (standard for Docker/production).
 */
@Injectable()
export class ChecklistScheduleRecurrenceService {
  private readonly logger = new Logger(ChecklistScheduleRecurrenceService.name);

  /**
   * Compute the next valid run time for a schedule.
   *
   * @param scheduleLike - rrule, timezone, startsAt, endsAt
   * @param after - Optional "after" date; defaults to now. If startsAt is set and in the future, uses max(now, startsAt).
   * @param options.inclusive - If true (default), when `after` is exactly an occurrence, return it. If false, return the next occurrence strictly after `after`. Use false for cron advancement after a generated run.
   * @returns The next occurrence as a true UTC Date, or null if none exists within the schedule window.
   */
  computeNextRunAt(
    scheduleLike: ScheduleLikeForRecurrence,
    after?: Date,
    options?: { inclusive?: boolean },
  ): Date | null {
    const now = after ?? new Date();

    if (scheduleLike.endsAt && scheduleLike.endsAt < now) {
      return null;
    }

    const afterDate = this.resolveAfterDate(scheduleLike.startsAt, now);

    let rule: RRule;
    try {
      const parsed = RRule.parseString(scheduleLike.rrule);
      const dtstart = this.buildDtstartInTimezone(
        parsed,
        scheduleLike.startsAt ?? afterDate,
        scheduleLike.timezone,
      );
      rule = new RRule({
        ...parsed,
        dtstart,
        tzid: scheduleLike.timezone,
      });
    } catch (err) {
      this.logger.warn(
        `Invalid RRULE "${scheduleLike.rrule}": ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }

    const inclusive = options?.inclusive ?? true;
    const next = rule.after(afterDate, inclusive);
    if (!next) return null;

    if (scheduleLike.endsAt && next > scheduleLike.endsAt) {
      return null;
    }

    return this.normalizeToUtcIfNeeded(next, scheduleLike.timezone);
  }

  private resolveAfterDate(startsAt: Date | null | undefined, now: Date): Date {
    if (!startsAt) return now;
    return startsAt > now ? startsAt : now;
  }

  /**
   * Build dtstart in the schedule timezone. Uses Luxon so BYHOUR/BYMINUTE are
   * interpreted as local time in that zone (handles DST correctly).
   *
   * Assumption: Schedules use a single run time per day. When BYHOUR/BYMINUTE
   * are arrays (RFC 5545 allows multiple values, e.g. BYHOUR=6,12), we use the
   * first element for dtstart. This is correct for single-value rules and
   * acceptable for our product; multi-time-per-day rules are not supported.
   */
  private buildDtstartInTimezone(
    parsed: Partial<Options>,
    anchorDate: Date,
    timezone: string,
  ): Date {
    const anchor = DateTime.fromJSDate(anchorDate, { zone: timezone });
    const hour =
      parsed.byhour != null
        ? Array.isArray(parsed.byhour)
          ? parsed.byhour[0]
          : parsed.byhour
        : 0;
    const minute =
      parsed.byminute != null
        ? Array.isArray(parsed.byminute)
          ? parsed.byminute[0]
          : parsed.byminute
        : 0;
    const dt = DateTime.fromObject(
      {
        year: anchor.year,
        month: anchor.month,
        day: anchor.day,
        hour,
        minute,
        second: 0,
        millisecond: 0,
      },
      { zone: timezone },
    );
    return dt.toJSDate();
  }

  /**
   * rrule with tzid returns dates that depend on system timezone:
   * - When TZ=UTC (common in production): returns true UTC, use as-is.
   * - Otherwise: returns "pseudo-UTC" (getUTC* = local time in tzid zone),
   *   convert to true UTC for persistence.
   */
  private normalizeToUtcIfNeeded(date: Date, timezone: string): Date {
    if (process.env.TZ === 'UTC') {
      return date;
    }
    const local = DateTime.fromObject(
      {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
        hour: date.getUTCHours(),
        minute: date.getUTCMinutes(),
        second: date.getUTCSeconds(),
        millisecond: date.getUTCMilliseconds(),
      },
      { zone: timezone },
    );
    return local.toUTC().toJSDate();
  }
}
