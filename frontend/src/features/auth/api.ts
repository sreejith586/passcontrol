import { apiClient, post } from '@/core/api/client';
import { unwrapResponse } from '@/core/api/response-unwrap';
import type { LoginRequest, LoginResponse } from './types';

export async function login(dto: LoginRequest): Promise<LoginResponse> {
  return post<LoginResponse>('/v1/auth/login', dto);
}

/** Same shape as login; gated server-side by DEMO_INSTANT_ACCESS_ENABLED. */
export async function demoInstantAccess(): Promise<LoginResponse> {
  const key = import.meta.env.VITE_DEMO_INSTANT_ACCESS_KEY as string | undefined;
  const res = await apiClient.post(
    '/v1/auth/demo-access',
    {},
    {
      ...(key != null && key !== ''
        ? { headers: { 'X-Demo-Access-Key': key } }
        : {}),
    },
  );
  return unwrapResponse<LoginResponse>(res.data);
}

export interface ValidateSetupTokenResponse {
  valid: boolean;
  reason?: 'invalid' | 'expired' | 'used';
}

export async function validateSetupToken(
  token: string
): Promise<ValidateSetupTokenResponse> {
  return post<ValidateSetupTokenResponse>('/v1/auth/validate-setup-token', {
    token,
  });
}

export interface SetPasswordResponse {
  passwordSet: boolean;
}

export async function setPassword(
  token: string,
  password: string,
  passwordConfirm?: string
): Promise<SetPasswordResponse> {
  return post<SetPasswordResponse>('/v1/auth/set-password', {
    token,
    password,
    ...(passwordConfirm != null && passwordConfirm !== ''
      ? { passwordConfirm }
      : {}),
  });
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
}

export async function changePassword(
  dto: ChangePasswordDto
): Promise<ChangePasswordResponse> {
  return post<ChangePasswordResponse>('/v1/auth/change-password', dto);
}
