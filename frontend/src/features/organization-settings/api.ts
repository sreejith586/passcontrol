import { get, patch } from '@/core/api/client';
import type { AlertWorkflowSettings, RegionalSettings } from './types';

export async function getAlertWorkflow(): Promise<AlertWorkflowSettings> {
  return get<AlertWorkflowSettings>('/organization-settings/alert-workflow');
}

export async function updateAlertWorkflow(
  dto: Partial<AlertWorkflowSettings>
): Promise<AlertWorkflowSettings> {
  return patch<AlertWorkflowSettings>(
    '/organization-settings/alert-workflow',
    dto
  );
}

export async function getRegionalSettings(): Promise<RegionalSettings> {
  return get<RegionalSettings>('/organization-settings/regional');
}

export async function updateRegionalSettings(
  dto: Partial<RegionalSettings>
): Promise<RegionalSettings> {
  return patch<RegionalSettings>('/organization-settings/regional', dto);
}

export async function getRegionalResolved(params?: {
  locationId?: string;
}): Promise<{ timezone: string; temperatureUnit: string }> {
  const searchParams: Record<string, string> = {};
  if (params?.locationId) searchParams.locationId = params.locationId;
  return get<{ timezone: string; temperatureUnit: string }>(
    '/organization-settings/regional-resolved',
    searchParams
  );
}
