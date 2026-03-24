/**
 * Default org-scoped roles for every newly provisioned organization (e.g. self-onboarding).
 * Bundles align with `prisma/seed.ts` RESTAURANT_ROLES (`area_manager`, `operator`, `shift_lead`,
 * `restaurant_manager`); `supervisor` ≈ shift_lead, `staff` ≈ operator, `location_manager` ≈
 * restaurant_manager + brand/location/zone/user visibility.
 *
 * `org_admin`: all rows in `permissions` (full org-level access).
 */

export interface DefaultOrgRoleDefinition {
  key: string;
  name: string;
  /** Use `all` for org_admin — every permission in the system. */
  permissionKeys: readonly string[] | 'all';
}

export const DEFAULT_ORGANIZATION_ROLES: readonly DefaultOrgRoleDefinition[] = [
  {
    key: 'org_admin',
    name: 'Org Admin',
    permissionKeys: 'all',
  },
  {
    key: 'area_manager',
    name: 'Area Manager',
    permissionKeys: [
      'checklist.template.create',
      'checklist.template.view',
      'checklist.template.update',
      'checklist.template.publish',
      'checklist.template.archive',
      'checklist.schedule.view',
      'checklist.schedule.create',
      'checklist.schedule.update',
      'checklist.schedule.activate',
      'checklist.schedule.deactivate',
      'checklist.run.view',
      'checklist.run.generate',
      'checklist.run.update',
      'checklist.run.submit',
      'alert.view',
      'alert.acknowledge',
      'alert.resolve',
      'alert.assign',
      'alert.sla-policy.view',
      'alert.sla-policy.manage',
      'alert.workflow-policy.view',
      'alert.workflow-policy.manage',
      'temperature.reading.create',
      'temperature.reading.view',
      'temperature.policy.create',
      'temperature.policy.view',
      'temperature.policy.update',
      'file.upload',
      'file.view',
      'attachment.view',
      'attachment.create',
      'attachment.delete',
      'user.view',
      'reports.view',
    ],
  },
  {
    key: 'location_manager',
    name: 'Location Manager',
    permissionKeys: [
      'checklist.template.view',
      'checklist.schedule.view',
      'checklist.schedule.create',
      'checklist.schedule.update',
      'checklist.schedule.activate',
      'checklist.schedule.deactivate',
      'checklist.run.view',
      'checklist.run.generate',
      'checklist.run.update',
      'checklist.run.submit',
      'alert.view',
      'alert.acknowledge',
      'alert.resolve',
      'alert.assign',
      'alert.sla-policy.view',
      'alert.workflow-policy.view',
      'temperature.reading.create',
      'temperature.reading.view',
      'temperature.policy.view',
      'temperature.policy.update',
      'file.upload',
      'file.view',
      'attachment.view',
      'attachment.create',
      'brand.view',
      'location.view',
      'zone.view',
      'user.view',
    ],
  },
  {
    key: 'supervisor',
    name: 'Supervisor',
    permissionKeys: [
      'checklist.template.view',
      'checklist.schedule.view',
      'checklist.run.view',
      'checklist.run.update',
      'checklist.run.submit',
      'alert.view',
      'alert.acknowledge',
      'alert.resolve',
      'alert.assign',
      'temperature.reading.view',
      'temperature.policy.view',
      'file.view',
      'attachment.view',
      'attachment.create',
    ],
  },
  {
    key: 'staff',
    name: 'Staff',
    permissionKeys: [
      'checklist.template.view',
      'checklist.schedule.view',
      'checklist.run.view',
      'checklist.run.update',
      'checklist.run.submit',
      'alert.view',
      'temperature.reading.view',
      'temperature.policy.view',
      'file.view',
      'attachment.view',
      'attachment.create',
    ],
  },
];
