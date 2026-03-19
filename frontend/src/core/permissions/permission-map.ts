/**
 * Route path → required permission(s).
 * String = single permission (user must have it).
 * string[] = any-of (user must have at least one).
 */
export const ROUTE_PERMISSIONS: Record<string, string | string[]> = {
  '/dashboard': ['checklist.run.view', 'alert.view'],
  '/alerts': 'alert.view',
  '/escalations': 'alert.view',
  '/settings/alert-workflow': 'alert.workflow-policy.view',
  '/settings/users': 'user.view',
  '/settings/roles': 'user.view',
};

/**
 * Action → required permission.
 */
export const ACTION_PERMISSIONS: Record<string, string> = {
  'alert.view': 'alert.view',
  'alert.acknowledge': 'alert.acknowledge',
  'alert.resolve': 'alert.resolve',
  'alert.assign': 'alert.assign',
  'alert.workflow-policy.manage': 'alert.workflow-policy.manage',
};

export function getRoutePermission(pathname: string): string | string[] | undefined {
  const normalized = pathname.replace(/\/$/, '') || '/';
  for (const [route, perm] of Object.entries(ROUTE_PERMISSIONS)) {
    if (normalized === route || normalized.startsWith(route + '/')) {
      return perm;
    }
  }
  return undefined;
}
