/**
 * Route path → required permission(s).
 * String = single permission (user must have it).
 * string[] = any-of (user must have at least one).
 */
export const ROUTE_PERMISSIONS: Record<string, string | string[]> = {
  '/dashboard': ['checklist.run.view', 'alert.view'],
  '/checklist-runs': 'checklist.run.view',
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

/** Routes to check for fallback, in order of preference. */
const FALLBACK_ROUTE_ORDER: (keyof typeof ROUTE_PERMISSIONS)[] = [
  '/dashboard',
  '/checklist-runs',
  '/alerts',
  '/escalations',
  '/settings/alert-workflow',
  '/settings/users',
  '/settings/roles',
];

/**
 * Returns the first route the user can access, or null if none.
 */
export function getFirstAccessibleRoute(permissions: string[]): string | null {
  for (const route of FALLBACK_ROUTE_ORDER) {
    const required = ROUTE_PERMISSIONS[route];
    if (!required) continue;
    const hasAccess = Array.isArray(required)
      ? required.some((p) => permissions.includes(p))
      : permissions.includes(required);
    if (hasAccess) return route;
  }
  return null;
}
