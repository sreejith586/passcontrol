import { get, post } from '@/core/api/client';

export interface QuickSetupResponse {
  runId: string;
}

export async function quickSetup(): Promise<QuickSetupResponse> {
  return post<QuickSetupResponse>('/v1/onboarding/quick-setup', {});
}

/** GET /v1/onboarding/first-run-status — self-onboarded flag + counts for dashboard checklist. */
export interface FirstRunStatusResponse {
  isSelfOnboarded: boolean;
  tenantType: 'DEMO' | 'STANDARD';
  demoWorkspaceAvailable: boolean;
  emailVerifiedAt: string | null;
  templateCount: number;
  scheduleCount: number;
  orgMemberCount: number;
  checklistRunCount: number;
}

export async function getFirstRunStatus(): Promise<FirstRunStatusResponse> {
  return get<FirstRunStatusResponse>('/v1/onboarding/first-run-status');
}

export interface DemoWorkspaceSetupResponse {
  runId: string;
  alreadyInitialized: boolean;
  message: string;
}

export async function demoWorkspaceSetup(): Promise<DemoWorkspaceSetupResponse> {
  return post<DemoWorkspaceSetupResponse>('/v1/onboarding/demo-setup', {});
}
