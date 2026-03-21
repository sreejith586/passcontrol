import { post } from '@/core/api/client';

export interface QuickSetupResponse {
  runId: string;
}

export async function quickSetup(): Promise<QuickSetupResponse> {
  return post<QuickSetupResponse>('/onboarding/quick-setup', {});
}
