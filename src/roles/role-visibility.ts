import { ROLE_SCOPE_PLATFORM } from './role-scope.constants';

export type RoleWithScope = {
  id: string;
  name: string;
  key: string;
  scope?: string | null;
};

/** Strip platform-scoped roles from tenant API payloads (users list, profile, invite responses). */
export function filterRolesForTenantApi(
  roles: RoleWithScope[],
): Array<{ id: string; name: string; key: string }> {
  return roles
    .filter((r) => r.scope !== ROLE_SCOPE_PLATFORM)
    .map(({ id, name, key }) => ({ id, name, key }));
}
