import { useAuth } from '@/core/auth/auth-context';

export function usePermission(permission: string): boolean {
  const { permissions } = useAuth();
  return permissions.includes(permission);
}

export function usePermissions(permissionOrList: string | readonly string[]): boolean {
  const { permissions } = useAuth();
  if (typeof permissionOrList === 'string') {
    return permissions.includes(permissionOrList);
  }
  return permissionOrList.some((p) => permissions.includes(p));
}
