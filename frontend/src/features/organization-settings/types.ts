export interface AlertWorkflowSettings {
  requireResolutionNoteOnResolve: boolean;
  requireReopenNoteOnReopen: boolean;
}

export interface RegionalSettings {
  defaultTimezone: string | null;
  defaultTemperatureUnit: 'F' | 'C' | null;
}
