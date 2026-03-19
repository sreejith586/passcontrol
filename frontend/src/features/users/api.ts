import { get, post, patch, del } from '@/core/api/client';
import type { PaginatedData } from '@/core/api/types';

export interface UserRole {
  id: string;
  name: string;
  key: string;
}

export interface UserForAssignment {
  id: string;
  name: string;
  email: string;
  isActive?: boolean;
  roles?: UserRole[];
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
}

export interface Role {
  id: string;
  name: string;
  key: string;
  permissions: string[];
}

export interface InviteUserDto {
  email: string;
  roleId: string;
}

/**
 * List org-scoped users. Backend GET /v1/users.
 */
export async function listUsers(
  params: ListUsersParams = {}
): Promise<PaginatedData<UserForAssignment>> {
  const cleanParams: Record<string, number> = {};
  if (params.page != null) cleanParams.page = params.page;
  if (params.limit != null) cleanParams.limit = params.limit;
  return get<PaginatedData<UserForAssignment>>('/users', cleanParams);
}

/**
 * List roles assignable in the organization. Backend GET /v1/roles.
 */
export async function listRoles(): Promise<Role[]> {
  return get<Role[]>('/roles');
}

/**
 * Add user to organization (admin provisioning). Backend POST /v1/users/invite.
 */
export async function addUser(dto: InviteUserDto): Promise<UserForAssignment> {
  return post<UserForAssignment>('/users/invite', dto);
}

/**
 * Add role to user. Backend POST /v1/users/:id/roles.
 */
export async function addUserRole(
  userId: string,
  roleId: string
): Promise<UserForAssignment> {
  return post<UserForAssignment>(`/users/${userId}/roles`, { roleId });
}

/**
 * Remove role from user. Backend DELETE /v1/users/:id/roles/:roleId.
 */
export async function removeUserRole(
  userId: string,
  roleId: string
): Promise<UserForAssignment> {
  return del<UserForAssignment>(`/users/${userId}/roles/${roleId}`);
}

/**
 * Update user status. Backend PATCH /v1/users/:id/status.
 */
export async function updateUserStatus(
  userId: string,
  isActive: boolean
): Promise<UserForAssignment> {
  return patch<UserForAssignment>(`/users/${userId}/status`, { isActive });
}
