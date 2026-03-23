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
    description:
      'Manage the platform across all organizations. Create and edit orgs, assign system administrators, and configure global settings.',
    scopeLabel: 'Platform',
    intendedUserType: 'System administrator',
  },
  org_admin: {
    displayName: 'Org Admin',
    description:
      'Manage users, roles, templates, schedules, and alerts. Invite team members, assign roles, and configure organization-wide workflow policies.',
    scopeLabel: 'Organization',
    intendedUserType: 'Organization administrator',
  },
  area_manager: {
    displayName: 'Area Manager',
    description:
      'Manage multiple locations: create templates, configure schedules, set SLA policies, and control which users see which locations.',
    scopeLabel: 'Organization',
    intendedUserType: 'Multi-location manager',
  },
  restaurant_manager: {
    displayName: 'Restaurant Manager',
    description:
      'Run daily operations: generate checklist runs, execute checklists, resolve alerts, and ensure temperature compliance.',
    scopeLabel: 'Organization',
    intendedUserType: 'Restaurant manager',
  },
  kitchen_supervisor: {
    displayName: 'Kitchen Supervisor',
    description:
      'Oversee kitchen operations: complete checklists, acknowledge and assign alerts, and monitor temperature readings.',
    scopeLabel: 'Organization',
    intendedUserType: 'Kitchen supervisor',
  },
  shift_lead: {
    displayName: 'Shift Lead',
    description:
      'Lead the shift: execute checklists, triage and assign alerts, and ensure runs are completed on time.',
    scopeLabel: 'Organization',
    intendedUserType: 'Shift lead',
  },
  operator: {
    displayName: 'Operator',
    description:
      'Complete daily tasks: run checklists, submit results, and view assigned alerts.',
    scopeLabel: 'Organization',
    intendedUserType: 'Frontline operator',
  },
  auditor: {
    displayName: 'Auditor',
    description:
      'Review compliance: view checklists, runs, alerts, and reports for audits without making changes.',
    scopeLabel: 'Organization',
    intendedUserType: 'Auditor / Compliance reviewer',
  },
  viewer: {
    displayName: 'Viewer',
    description:
      'Observe operations: view checklists, runs, alerts, and compliance data in read-only mode.',
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
