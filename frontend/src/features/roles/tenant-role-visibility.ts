/** Aligns with backend ROLE_SCOPE_PLATFORM — hide from tenant UIs even if a client is outdated. */
export const TENANT_HIDDEN_ROLE_SCOPE = 'PLATFORM';

export function isTenantVisibleRole(role: {
  scope?: string | null;
  key: string;
}): boolean {
  if (role.scope === TENANT_HIDDEN_ROLE_SCOPE) return false;
  if (role.key === 'super_admin') return false;
  return true;
}

export function filterTenantAssignableRoles<T extends { scope?: string | null; key: string }>(
  roles: T[],
): T[] {
  return roles.filter(isTenantVisibleRole);
}
