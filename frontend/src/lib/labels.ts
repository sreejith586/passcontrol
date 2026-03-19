/** User-friendly labels for backend source type enums. Fallback to raw value for unknowns. */
const SOURCE_TYPE_LABELS: Record<string, string> = {
  CHECKLIST_RUN_ITEM: 'Checklist item',
  TEMPERATURE_READING: 'Temperature reading',
};

export function getSourceTypeLabel(sourceType: string | null | undefined): string {
  if (!sourceType) return '—';
  return SOURCE_TYPE_LABELS[sourceType] ?? sourceType;
}
