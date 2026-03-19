import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSIONS = 'require_permissions';
export const REQUIRE_ANY_PERMISSION = 'require_any_permission';

export function RequirePermissions(...permissions: string[]) {
  return SetMetadata(REQUIRE_PERMISSIONS, permissions);
}

/** Requires at least one of the given permissions. */
export function RequireAnyPermission(...permissions: string[]) {
  return SetMetadata(REQUIRE_ANY_PERMISSION, permissions);
}
