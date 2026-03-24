import { get, post } from '@/core/api/client';

export interface QuickSetupResponse {
  runId: string;
}

export async function quickSetup(): Promise<QuickSetupResponse> {
  return post<QuickSetupResponse>('/onboarding/quick-setup', {});
}

/** GET /v1/onboarding/first-run-status — self-onboarded flag + counts for dashboard checklist. */
export interface FirstRunStatusResponse {
  isSelfOnboarded: boolean;
  emailVerifiedAt: string | null;
  templateCount: number;
  scheduleCount: number;
  orgMemberCount: number;
  checklistRunCount: number;
}

export async function getFirstRunStatus(): Promise<FirstRunStatusResponse> {
  return get<FirstRunStatusResponse>('/onboarding/first-run-status');
}
