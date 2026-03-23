import { get, patch } from '@/core/api/client';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  jobTitle: string | null;
  roles: Array<{ id: string; name: string; key: string }>;
}

export interface UpdateProfileDto {
  name?: string;
  phoneNumber?: string | null;
  jobTitle?: string | null;
}

export async function getMyProfile(): Promise<UserProfile> {
  return get<UserProfile>('/users/me');
}

export async function updateMyProfile(dto: UpdateProfileDto): Promise<UserProfile> {
  return patch<UserProfile>('/users/me', dto);
}
