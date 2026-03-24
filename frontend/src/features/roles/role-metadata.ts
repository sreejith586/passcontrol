/**
 * Frontend-only role metadata for display (invite, role edit, user table).
 * Does not drive authorization; keys must stay aligned with org-scoped roles from the API.
 */

export interface RoleMetadata {
  displayName: string;
  /** One or two sentences for selection and trust. */
  description: string;
  scopeLabel: 'Platform' | 'Organization';
  /** Short label for who this role is for (legacy / compact contexts). */
  intendedUserType: string;
  /** 2–4 high-level capability hints (no raw permission keys). */
  capabilityHints: string[];
}

export const ROLE_METADATA: Record<string, RoleMetadata> = {
  super_admin: {
    displayName: 'Super Admin',
    description:
      'Full platform access across all organizations: manage tenants, system-wide settings, and cross-org administration.',
    scopeLabel: 'Platform',
    intendedUserType: 'System administrator',
    capabilityHints: [
      'Manage all organizations',
      'Configure platform-wide policies',
      'Assign system roles',
    ],
  },
  org_admin: {
    displayName: 'Org Admin',
    description:
      'Full control within this organization: users, roles, templates, schedules, alerts, and operational settings.',
    scopeLabel: 'Organization',
    intendedUserType: 'Organization administrator',
    capabilityHints: [
      'Manage users and invitations',
      'Configure templates and schedules',
      'Manage alerts and workflow policies',
      'Access all org operational areas',
    ],
  },
  area_manager: {
    displayName: 'Area Manager',
    description:
      'Oversees multiple sites: create and publish templates, manage schedules and SLA policies, and review reports across locations.',
    scopeLabel: 'Organization',
    intendedUserType: 'Multi-location manager',
    capabilityHints: [
      'Manage checklist templates',
      'Manage schedules',
      'View reports',
      'Coordinate alerts across areas',
    ],
  },
  location_manager: {
    displayName: 'Location Manager',
    description:
      'Manages daily operations at assigned locations, including schedules, checklist execution, and team visibility for that site.',
    scopeLabel: 'Organization',
    intendedUserType: 'Site or location lead',
    capabilityHints: [
      'Manage schedules for the location',
      'Generate and track checklist runs',
      'Triage and assign alerts',
      'View location structure and team',
    ],
  },
  restaurant_manager: {
    displayName: 'Restaurant Manager',
    description:
      'Runs day-to-day operations: schedules, checklist runs, alerts, and temperature compliance for the venue.',
    scopeLabel: 'Organization',
    intendedUserType: 'Operations manager',
    capabilityHints: [
      'Manage schedules',
      'Execute and oversee checklist runs',
      'Resolve and assign alerts',
      'Record temperature compliance',
    ],
  },
  kitchen_supervisor: {
    displayName: 'Kitchen Supervisor',
    description:
      'Supervises kitchen execution: checklists, alert triage, and monitoring of readings and policies.',
    scopeLabel: 'Organization',
    intendedUserType: 'Kitchen supervisor',
    capabilityHints: [
      'Complete and supervise checklist runs',
      'Acknowledge and assign alerts',
      'Monitor temperature and policies',
    ],
  },
  supervisor: {
    displayName: 'Supervisor',
    description:
      'Leads frontline execution: completes checklists, triages alerts, and coordinates responses during shifts.',
    scopeLabel: 'Organization',
    intendedUserType: 'Shift or team supervisor',
    capabilityHints: [
      'Execute checklist runs',
      'Acknowledge and assign alerts',
      'Coordinate on-shift responses',
    ],
  },
  shift_lead: {
    displayName: 'Shift Lead',
    description:
      'Leads the shift: runs checklists, handles alert triage, and keeps tasks on track for the team.',
    scopeLabel: 'Organization',
    intendedUserType: 'Shift lead',
    capabilityHints: [
      'Execute checklist runs',
      'Triage and assign alerts',
      'Support the team during the shift',
    ],
  },
  operator: {
    displayName: 'Operator',
    description:
      'Completes assigned checklists and tasks, submits results, and works from operational views.',
    scopeLabel: 'Organization',
    intendedUserType: 'Frontline operator',
    capabilityHints: [
      'Execute checklists',
      'Submit run results',
      'View relevant alerts',
    ],
  },
  staff: {
    displayName: 'Staff',
    description:
      'Day-to-day execution of checklists and basic operational tasks with focused, task-level access.',
    scopeLabel: 'Organization',
    intendedUserType: 'Frontline staff',
    capabilityHints: [
      'Execute checklist runs',
      'Submit results',
      'View assigned operational items',
    ],
  },
  auditor: {
    displayName: 'Auditor',
    description:
      'Reviews compliance and history: read-only access to runs, alerts, and evidence for audits.',
    scopeLabel: 'Organization',
    intendedUserType: 'Auditor / Compliance reviewer',
    capabilityHints: [
      'View checklists and runs',
      'Review alerts and history',
      'Export or review for audits',
    ],
  },
  viewer: {
    displayName: 'Viewer',
    description:
      'Observes activity in read-only mode: templates, runs, and alerts without changing data.',
    scopeLabel: 'Organization',
    intendedUserType: 'Observer',
    capabilityHints: [
      'View templates and schedules',
      'View runs and alerts',
      'No edits or assignments',
    ],
  },
};

const FALLBACK_METADATA: RoleMetadata = {
  displayName: 'Custom role',
  description:
    'A role defined for your organization with specific permissions chosen by an administrator.',
  scopeLabel: 'Organization',
  intendedUserType: 'Custom',
  capabilityHints: [
    'Capabilities depend on org configuration',
    'Ask your administrator if unsure',
  ],
};

export function getRoleMetadata(roleKey: string): RoleMetadata {
  return ROLE_METADATA[roleKey] ?? {
    ...FALLBACK_METADATA,
    displayName: roleKey.replace(/_/g, ' '),
  };
}

/** Primary role for table display: Super Admin wins, else first in list. */
export function getPrimaryRoleMetadata(
  roles: { key: string }[] | undefined
): { meta: RoleMetadata; extraRoleCount: number } | null {
  if (!roles?.length) return null;
  const superAdmin = roles.find((r) => r.key === 'super_admin');
  const primary = superAdmin ?? roles[0];
  return {
    meta: getRoleMetadata(primary.key),
    extraRoleCount: Math.max(0, roles.length - 1),
  };
}

/** Tooltip text: description, hints, optional multi-role note (no raw permission keys). */
export function formatRoleTooltip(
  meta: RoleMetadata,
  extraRoleCount: number
): string {
  const lines = [
    meta.description,
    ...meta.capabilityHints.map((h) => `• ${h}`),
  ];
  if (extraRoleCount > 0) {
    lines.push(
      `Also has ${extraRoleCount} additional role${extraRoleCount === 1 ? '' : 's'}.`
    );
  }
  return lines.join('\n');
}
