import { post } from '@/core/api/client';
import type { LoginRequest, LoginResponse } from './types';

export async function login(dto: LoginRequest): Promise<LoginResponse> {
  return post<LoginResponse>('/auth/login', dto);
}
