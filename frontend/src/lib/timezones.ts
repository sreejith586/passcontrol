/**
 * Common IANA timezones for select dropdowns.
 * Grouped by region for maintainability.
 */
export const TIMEZONES = [
  'UTC',
  // Americas
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  // Europe
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Stockholm',
  'Europe/Helsinki',
  'Europe/Athens',
  'Europe/Istanbul',
  'Europe/Moscow',
  // Middle East
  'Asia/Dubai',
  'Asia/Riyadh',
  'Asia/Tehran',
  'Asia/Jerusalem',
  'Asia/Kuwait',
  'Asia/Bahrain',
  'Asia/Doha',
  // Asia
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Singapore',
  'Asia/Seoul',
  'Asia/Bangkok',
  'Asia/Jakarta',
  'Asia/Kuala_Lumpur',
  'Asia/Mumbai',
  'Asia/Kolkata',
  // Oceania
  'Australia/Sydney',
  'Australia/Melbourne',
] as const;

export function getBrowserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return (TIMEZONES as readonly string[]).includes(tz) ? tz : 'UTC';
  } catch {
    return 'UTC';
  }
}
