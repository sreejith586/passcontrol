import { post } from '@/core/api/client';
import type { SelfSignupMode } from './types';

export interface SelfOnboardingSignupPayload {
  fullName: string;
  email: string;
  phoneNumber?: string;
  organizationName: string;
  jobTitle?: string;
  password: string;
  signupMode: SelfSignupMode;
  signupSource?: string;
}

export interface SelfOnboardingSignupResult {
  message: string;
  organizationId: string;
  requiresEmailVerification: true;
}

export async function selfOnboardingSignup(
  payload: SelfOnboardingSignupPayload
): Promise<SelfOnboardingSignupResult> {
  return post<SelfOnboardingSignupResult>(
    '/public/self-onboarding/signup',
    payload
  );
}

export interface SelfOnboardingVerifyEmailResult {
  message: string;
}

export async function selfOnboardingVerifyEmail(
  token: string
): Promise<SelfOnboardingVerifyEmailResult> {
  return post<SelfOnboardingVerifyEmailResult>(
    '/public/self-onboarding/verify-email',
    { token }
  );
}
