import { get, patch } from '@/core/api/client';
import type { AlertWorkflowSettings } from './types';

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
