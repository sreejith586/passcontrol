/**
 * Frontend-only role metadata for display.
 * Maps role keys to human-friendly labels, descriptions, and scope.
 */

export interface RoleMetadata {
  displayName: string;
  description: string;
  scopeLabel: 'Platform' | 'Organization';
  intendedUserType: string;
}

export const ROLE_METADATA: Record<string, RoleMetadata> = {
  super_admin: {
    displayName: 'Super Admin',
    description: 'Full platform access across all organizations. For system administrators.',
    scopeLabel: 'Platform',
    intendedUserType: 'System administrator',
  },
  org_admin: {
    displayName: 'Org Admin',
    description: 'Full control over the organization: users, roles, templates, schedules, and alerts.',
    scopeLabel: 'Organization',
    intendedUserType: 'Organization administrator',
  },
  area_manager: {
    displayName: 'Area Manager',
    description: 'Manages multiple locations: templates, schedules, SLA policies, and user visibility.',
    scopeLabel: 'Organization',
    intendedUserType: 'Multi-location manager',
  },
  restaurant_manager: {
    displayName: 'Restaurant Manager',
    description: 'Runs the restaurant: schedules, checklist execution, alerts, and temperature compliance.',
    scopeLabel: 'Organization',
    intendedUserType: 'Restaurant manager',
  },
  kitchen_supervisor: {
    displayName: 'Kitchen Supervisor',
    description: 'Oversees kitchen operations: checklists, alerts, and temperature monitoring.',
    scopeLabel: 'Organization',
    intendedUserType: 'Kitchen supervisor',
  },
  shift_lead: {
    displayName: 'Shift Lead',
    description: 'Leads the shift: executes checklists, triages alerts, and assigns work.',
    scopeLabel: 'Organization',
    intendedUserType: 'Shift lead',
  },
  operator: {
    displayName: 'Operator',
    description: 'Day-to-day execution: completes checklists and views alerts.',
    scopeLabel: 'Organization',
    intendedUserType: 'Frontline operator',
  },
  auditor: {
    displayName: 'Auditor',
    description: 'Read-only access for compliance reviews and audits.',
    scopeLabel: 'Organization',
    intendedUserType: 'Auditor / Compliance reviewer',
  },
  viewer: {
    displayName: 'Viewer',
    description: 'Read-only access to checklists, runs, alerts, and compliance data.',
    scopeLabel: 'Organization',
    intendedUserType: 'Viewer / Observer',
  },
};

export function getRoleMetadata(roleKey: string): RoleMetadata {
  return (
    ROLE_METADATA[roleKey] ?? {
      displayName: roleKey,
      description: 'Custom role with configured permissions.',
      scopeLabel: 'Organization',
      intendedUserType: 'Custom',
    }
  );
}
