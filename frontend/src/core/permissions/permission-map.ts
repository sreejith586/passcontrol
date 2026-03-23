/**
 * Route path → required permission(s).
 * String = single permission (user must have it).
 * string[] = any-of (user must have at least one).
 */
export const ROUTE_PERMISSIONS: Record<string, string | string[]> = {
  '/dashboard': ['checklist.run.view', 'alert.view'],
  '/checklist-runs': 'checklist.run.view',
  '/checklist-templates': ['checklist.template.view', 'checklist.template.create'],
  '/checklist-schedules': ['checklist.schedule.view', 'checklist.schedule.create'],
  '/brands': ['brand.view', 'brand.manage'],
  '/locations': ['location.view', 'location.manage'],
  '/zones': ['zone.view', 'zone.manage'],
  '/alerts': 'alert.view',
  '/escalations': 'alert.view',
  '/settings/profile': ['alert.workflow-policy.view', 'user.view'],
  '/settings/security': ['alert.workflow-policy.view', 'user.view'],
  '/settings/organization': 'alert.workflow-policy.view',
  '/settings/users': 'user.view',
  '/settings/roles': 'user.view',
  '/settings/notifications': 'alert.view',
  '/reports': 'reports.view',
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
  '/checklist-templates',
  '/checklist-schedules',
  '/brands',
  '/locations',
  '/zones',
  '/checklist-runs',
  '/alerts',
  '/escalations',
  '/settings/profile',
  '/settings/organization',
  '/settings/users',
  '/settings/roles',
  '/settings/notifications',
  '/reports',
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
