import { post } from '@/core/api/client';
import type { LoginRequest, LoginResponse } from './types';

export async function login(dto: LoginRequest): Promise<LoginResponse> {
  return post<LoginResponse>('/auth/login', dto);
}

export interface ValidateSetupTokenResponse {
  valid: boolean;
  reason?: 'invalid' | 'expired' | 'used';
}

export async function validateSetupToken(
  token: string
): Promise<ValidateSetupTokenResponse> {
  return post<ValidateSetupTokenResponse>('/auth/validate-setup-token', {
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
  return post<SetPasswordResponse>('/auth/set-password', {
    token,
    password,
    ...(passwordConfirm != null && passwordConfirm !== ''
      ? { passwordConfirm }
      : {}),
  });
}
