export interface AlertWorkflowSettings {
  requireResolutionNoteOnResolve: boolean;
  requireReopenNoteOnReopen: boolean;
}

export interface RegionalSettings {
  defaultTimezone: string | null;
  defaultTemperatureUnit: 'F' | 'C' | null;
}

export interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUser?: string | null;
  fromEmail: string;
  fromName?: string | null;
  hasPassword?: boolean;
}

export interface UpdateEmailSettingsDto {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string | null;
  smtpPassword?: string | null;
  fromEmail?: string;
  fromName?: string | null;
}
