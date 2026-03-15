import { BadRequestException } from '@nestjs/common';
import { RRule } from 'rrule';

/**
 * Validates RRULE string. Throws BadRequestException if invalid.
 */
export function validateRrule(rrule: string): void {
  try {
    RRule.parseString(rrule);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : String(err);
    throw new BadRequestException(`Invalid RRULE: ${message}`);
  }
}

/**
 * Validates IANA timezone string. Throws BadRequestException if invalid.
 */
export function validateTimezone(timezone: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
  } catch (err) {
    if (err instanceof RangeError) {
      throw new BadRequestException(
        `Invalid timezone: ${timezone}. Must be a valid IANA timezone (e.g. America/New_York).`,
      );
    }
    throw err;
  }
}

/**
 * Validates startsAt/endsAt relationship. Throws BadRequestException if both
 * are present and endsAt is before startsAt.
 */
export function validateStartsAtEndsAt(
  startsAt: Date | null | undefined,
  endsAt: Date | null | undefined,
): void {
  if (startsAt && endsAt && endsAt < startsAt) {
    throw new BadRequestException(
      'endsAt must be on or after startsAt when both are provided.',
    );
  }
}
