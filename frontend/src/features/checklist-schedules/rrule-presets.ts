/**
 * v1 recurrence presets mapped to RRULE strings.
 * Used for schedule create/edit and display. No raw RRULE input in v1.
 */
export interface RrulePreset {
  id: string;
  label: string;
  rrule: string;
}

export const RRULE_PRESETS: RrulePreset[] = [
  { id: 'daily-6', label: 'Daily at 6:00', rrule: 'FREQ=DAILY;BYHOUR=6;BYMINUTE=0' },
  { id: 'daily-9', label: 'Daily at 9:00', rrule: 'FREQ=DAILY;BYHOUR=9;BYMINUTE=0' },
  { id: 'daily-18', label: 'Daily at 18:00', rrule: 'FREQ=DAILY;BYHOUR=18;BYMINUTE=0' },
  { id: 'twice-daily', label: 'Twice daily (6:00, 18:00)', rrule: 'FREQ=DAILY;BYHOUR=6,18;BYMINUTE=0' },
  { id: 'weekly-mo', label: 'Weekly Monday at 6:00', rrule: 'FREQ=WEEKLY;BYDAY=MO;BYHOUR=6;BYMINUTE=0' },
  { id: 'weekly-su', label: 'Weekly Sunday at 22:00', rrule: 'FREQ=WEEKLY;BYDAY=SU;BYHOUR=22;BYMINUTE=0' },
];

export const CUSTOM_FALLBACK_ID = '_custom';

export function findPresetByRrule(rrule: string): RrulePreset | null {
  const normalized = rrule?.trim().toUpperCase();
  if (!normalized) return null;
  return RRULE_PRESETS.find((p) => p.rrule.toUpperCase() === normalized) ?? null;
}

export function getPresetLabelForRrule(rrule: string): string {
  const preset = findPresetByRrule(rrule);
  return preset?.label ?? 'Custom existing schedule';
}
