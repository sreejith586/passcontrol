/**
 * Temperature unit options for select dropdowns.
 * Data values: 'F' | 'C'
 * Display: always "Fahrenheit (°F)" / "Celsius (°C)"
 */
export const TEMPERATURE_UNIT_OPTIONS = [
  { value: 'F' as const, label: 'Fahrenheit (°F)' },
  { value: 'C' as const, label: 'Celsius (°C)' },
] as const;

export function toDisplayUnit(unit: 'F' | 'C'): string {
  return unit === 'C' ? '°C' : '°F';
}
