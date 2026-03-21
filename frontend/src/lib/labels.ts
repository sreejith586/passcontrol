/** User-friendly labels for backend source type enums. Fallback to raw value for unknowns. */
const SOURCE_TYPE_LABELS: Record<string, string> = {
  CHECKLIST_RUN_ITEM: 'Checklist item',
  TEMPERATURE_READING: 'Temperature reading',
};

export function getSourceTypeLabel(sourceType: string | null | undefined): string {
  if (!sourceType) return '—';
  return SOURCE_TYPE_LABELS[sourceType] ?? sourceType;
}

/** Format source for display with optional sourceId for differentiation.
 *  Avoids repetitive "Checklist item" when sourceId can add context. */
export function formatSourceDisplay(
  sourceType: string | null | undefined,
  sourceId?: string | null
): string {
  const label = getSourceTypeLabel(sourceType);
  if (!sourceId || sourceId.length < 8) return label;
  const shortId = sourceId.slice(0, 8);
  if (sourceType === 'CHECKLIST_RUN_ITEM') {
    return `${label} · ${shortId}`;
  }
  return label;
}

/** Format alert source for display. Uses enriched sourceLabel when available, else formatSourceDisplay. */
export function formatAlertSourceDisplay(alert: {
  sourceLabel?: string | null;
  sourceContext?: { checklistName?: string; locationName?: string } | null;
  sourceType: string;
  sourceId: string;
}): { primary: string; secondary?: string } {
  if (alert.sourceLabel?.trim()) {
    const parts: string[] = [];
    if (alert.sourceContext?.checklistName) parts.push(alert.sourceContext.checklistName);
    if (alert.sourceContext?.locationName) parts.push(alert.sourceContext.locationName);
    const secondary = parts.length > 0 ? parts.join(' · ') : undefined;
    return { primary: alert.sourceLabel, secondary };
  }
  return {
    primary: formatSourceDisplay(alert.sourceType, alert.sourceId),
  };
}
