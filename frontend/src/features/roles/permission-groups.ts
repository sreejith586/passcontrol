/**
 * Frontend-only permission grouping for business-friendly display.
 * Maps raw permission keys to categories and human-readable labels.
 */

export const PERMISSION_GROUPS: Record<
  string,
  { label: string; description: string }
> = {
  'Alert Operations': {
    label: 'Alert Operations',
    description: 'View, acknowledge, resolve, and manage alerts',
  },
  Checklists: {
    label: 'Checklists',
    description: 'Templates, schedules, and run execution',
  },
  'Temperature & Compliance': {
    label: 'Temperature & Compliance',
    description: 'Temperature readings and policy management',
  },
  'Files & Attachments': {
    label: 'Files & Attachments',
    description: 'Upload and manage files and attachments',
  },
  Administration: {
    label: 'Administration',
    description: 'Users, roles, and organization settings',
  },
};

/** Permission key → category. Order matters for display. */
const PERMISSION_TO_CATEGORY: Record<string, string> = {
  'alert.view': 'Alert Operations',
  'alert.acknowledge': 'Alert Operations',
  'alert.resolve': 'Alert Operations',
  'alert.assign': 'Alert Operations',
  'alert.sla-policy.view': 'Alert Operations',
  'alert.sla-policy.manage': 'Alert Operations',
  'alert.workflow-policy.view': 'Alert Operations',
  'alert.workflow-policy.manage': 'Alert Operations',
  'checklist.template.view': 'Checklists',
  'checklist.template.create': 'Checklists',
  'checklist.template.update': 'Checklists',
  'checklist.template.publish': 'Checklists',
  'checklist.template.archive': 'Checklists',
  'checklist.schedule.view': 'Checklists',
  'checklist.schedule.create': 'Checklists',
  'checklist.schedule.update': 'Checklists',
  'checklist.schedule.activate': 'Checklists',
  'checklist.schedule.deactivate': 'Checklists',
  'checklist.run.view': 'Checklists',
  'checklist.run.generate': 'Checklists',
  'checklist.run.update': 'Checklists',
  'checklist.run.submit': 'Checklists',
  'temperature.reading.view': 'Temperature & Compliance',
  'temperature.reading.create': 'Temperature & Compliance',
  'temperature.policy.view': 'Temperature & Compliance',
  'temperature.policy.create': 'Temperature & Compliance',
  'temperature.policy.update': 'Temperature & Compliance',
  'file.view': 'Files & Attachments',
  'file.upload': 'Files & Attachments',
  'attachment.view': 'Files & Attachments',
  'attachment.create': 'Files & Attachments',
  'attachment.delete': 'Files & Attachments',
  'user.view': 'Administration',
  'user.invite': 'Administration',
  'user.manage': 'Administration',
};

/** Human-readable permission labels. */
const PERMISSION_LABELS: Record<string, string> = {
  'alert.view': 'View alerts',
  'alert.acknowledge': 'Acknowledge alerts',
  'alert.resolve': 'Resolve alerts',
  'alert.assign': 'Assign alerts',
  'alert.sla-policy.view': 'View SLA policies',
  'alert.sla-policy.manage': 'Manage SLA policies',
  'alert.workflow-policy.view': 'View workflow settings',
  'alert.workflow-policy.manage': 'Manage workflow settings',
  'checklist.template.view': 'View templates',
  'checklist.template.create': 'Create templates',
  'checklist.template.update': 'Update templates',
  'checklist.template.publish': 'Publish templates',
  'checklist.template.archive': 'Archive templates',
  'checklist.schedule.view': 'View schedules',
  'checklist.schedule.create': 'Create schedules',
  'checklist.schedule.update': 'Update schedules',
  'checklist.schedule.activate': 'Activate schedules',
  'checklist.schedule.deactivate': 'Deactivate schedules',
  'checklist.run.view': 'View runs',
  'checklist.run.generate': 'Generate runs',
  'checklist.run.update': 'Update run items',
  'checklist.run.submit': 'Submit runs',
  'temperature.reading.view': 'View temperature readings',
  'temperature.reading.create': 'Create temperature readings',
  'temperature.policy.view': 'View temperature policies',
  'temperature.policy.create': 'Create temperature policies',
  'temperature.policy.update': 'Update temperature policies',
  'file.view': 'View files',
  'file.upload': 'Upload files',
  'attachment.view': 'View attachments',
  'attachment.create': 'Create attachments',
  'attachment.delete': 'Delete attachments',
  'user.view': 'View users and roles',
  'user.invite': 'Invite users',
  'user.manage': 'Manage user roles and status',
};

export function getPermissionLabel(key: string): string {
  return PERMISSION_LABELS[key] ?? key;
}

export function groupPermissionsByCategory(
  permissions: string[]
): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const p of permissions) {
    const category = PERMISSION_TO_CATEGORY[p] ?? 'Other';
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(p);
  }
  return grouped;
}

/** Returns category keys in display order. */
export const CATEGORY_ORDER = [
  'Alert Operations',
  'Checklists',
  'Temperature & Compliance',
  'Files & Attachments',
  'Administration',
  'Other',
] as const;
