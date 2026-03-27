import { get, patch, post, put } from '@/core/api/client';
import type {
  AlertWorkflowSettings,
  RegionalSettings,
  EmailSettings,
  UpdateEmailSettingsDto,
} from './types';

export async function getAlertWorkflow(): Promise<AlertWorkflowSettings> {
  return get<AlertWorkflowSettings>('/v1/organization-settings/alert-workflow');
}

export async function updateAlertWorkflow(
  dto: Partial<AlertWorkflowSettings>
): Promise<AlertWorkflowSettings> {
  return patch<AlertWorkflowSettings>(
    '/v1/organization-settings/alert-workflow',
    dto
  );
}

export async function getRegionalSettings(): Promise<RegionalSettings> {
  return get<RegionalSettings>('/v1/organization-settings/regional');
}

export async function updateRegionalSettings(
  dto: Partial<RegionalSettings>
): Promise<RegionalSettings> {
  return patch<RegionalSettings>('/v1/organization-settings/regional', dto);
}

export async function getRegionalResolved(params?: {
  locationId?: string;
}): Promise<{ timezone: string; temperatureUnit: string }> {
  const searchParams: Record<string, string> = {};
  if (params?.locationId) searchParams.locationId = params.locationId;
  return get<{ timezone: string; temperatureUnit: string }>(
    '/v1/organization-settings/regional-resolved',
    searchParams
  );
}

export async function getEmailSettings(): Promise<EmailSettings | null> {
  return get<EmailSettings | null>('/v1/settings/email');
}

export async function updateEmailSettings(
  dto: UpdateEmailSettingsDto
): Promise<EmailSettings> {
  return put<EmailSettings>('/v1/settings/email', dto);
}

export async function sendTestEmail(): Promise<{ success: boolean; message: string }> {
  return post<{ success: boolean; message: string }>('/v1/settings/email/test');
}
