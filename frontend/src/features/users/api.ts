import { get } from '@/core/api/client';
import type { PaginatedData } from '@/core/api/types';

export interface UserForAssignment {
  id: string;
  name: string;
  email: string;
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
}

/**
 * List org-scoped users for assignment. Backend GET /v1/users.
 * No search param - backend does not support it yet.
 */
export async function listUsers(
  params: ListUsersParams = {}
): Promise<PaginatedData<UserForAssignment>> {
  const cleanParams: Record<string, number> = {};
  if (params.page != null) cleanParams.page = params.page;
  if (params.limit != null) cleanParams.limit = params.limit;
  return get<PaginatedData<UserForAssignment>>('/users', cleanParams);
}
