import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_ORGANIZATION_NAME = 'Demo Org';
const DEMO_USER_NAME = 'Demo Admin';
const DEMO_USER_EMAIL = 'admin@example.com';
const DEMO_USER_PASSWORD = 'Password123!';
const SUPER_ADMIN_ROLE_NAME = 'Super Admin';
const SUPER_ADMIN_ROLE_KEY = 'super_admin';
const SUPER_ADMIN_ROLE_SCOPE = 'ORGANIZATION';

const ORG_ADMIN_USER_EMAIL = 'org-admin@example.com';
const ORG_ADMIN_USER_NAME = 'Org Admin';
const ORG_ADMIN_USER_PASSWORD = 'Password123!';
const ORG_ADMIN_ROLE_NAME = 'Org Admin';
const ORG_ADMIN_ROLE_KEY = 'org_admin';
const ORG_ADMIN_ROLE_SCOPE = 'ORGANIZATION';

const PERMISSIONS: Array<{ key: string; name: string }> = [
  { key: 'temperature.reading.create', name: 'Create temperature readings' },
  { key: 'temperature.reading.view', name: 'View temperature readings' },
  { key: 'temperature.policy.create', name: 'Create temperature policies' },
  { key: 'temperature.policy.view', name: 'View temperature policies' },
  { key: 'temperature.policy.update', name: 'Update temperature policies' },
  { key: 'alert.view', name: 'View alert events' },
  { key: 'alert.acknowledge', name: 'Acknowledge alert events' },
  { key: 'alert.resolve', name: 'Resolve alert events' },
  { key: 'alert.sla-policy.view', name: 'View alert SLA policies' },
  { key: 'alert.sla-policy.manage', name: 'Manage alert SLA policies' },
  { key: 'file.upload', name: 'Upload files' },
  { key: 'file.view', name: 'View files' },
  { key: 'attachment.create', name: 'Create attachments' },
  { key: 'attachment.view', name: 'View attachments' },
  { key: 'attachment.delete', name: 'Delete attachments' },
  { key: 'checklist.template.create', name: 'Create checklist templates' },
  { key: 'checklist.template.view', name: 'View checklist templates' },
  { key: 'checklist.template.update', name: 'Update checklist templates' },
  { key: 'checklist.template.publish', name: 'Publish checklist templates' },
  { key: 'checklist.template.archive', name: 'Archive checklist templates' },
  { key: 'checklist.schedule.create', name: 'Create checklist schedules' },
  { key: 'checklist.schedule.view', name: 'View checklist schedules' },
  { key: 'checklist.schedule.update', name: 'Update checklist schedules' },
  { key: 'checklist.schedule.activate', name: 'Activate checklist schedules' },
  { key: 'checklist.schedule.deactivate', name: 'Deactivate checklist schedules' },
  { key: 'checklist.run.view', name: 'View checklist runs' },
  { key: 'checklist.run.generate', name: 'Generate checklist runs from schedules' },
  { key: 'checklist.run.update', name: 'Update checklist run items' },
  { key: 'checklist.run.submit', name: 'Submit checklist runs' },
];

async function ensureOrganization() {
  const organization = await prisma.organization.findFirst({
    where: {
      name: DEMO_ORGANIZATION_NAME,
      deletedAt: null,
    },
  });

  if (organization) {
    return organization;
  }

  return prisma.organization.create({
    data: { name: DEMO_ORGANIZATION_NAME },
  });
}

async function ensureUser(email: string, name: string, passwordHash: string) {
  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      isActive: true,
      deletedAt: null,
    },
    create: {
      email,
      name,
      passwordHash,
      isActive: true,
    },
  });
}

/** Platform/global role: organizationId = null */
async function ensureSuperAdminRole() {
  const role = await prisma.role.findFirst({
    where: { organizationId: null, key: SUPER_ADMIN_ROLE_KEY },
  });

  if (role) {
    return prisma.role.update({
      where: { id: role.id },
      data: {
        name: SUPER_ADMIN_ROLE_NAME,
        scope: SUPER_ADMIN_ROLE_SCOPE,
        isSystem: false,
      },
    });
  }

  return prisma.role.create({
    data: {
      organizationId: null,
      name: SUPER_ADMIN_ROLE_NAME,
      key: SUPER_ADMIN_ROLE_KEY,
      scope: SUPER_ADMIN_ROLE_SCOPE,
      isSystem: false,
    },
  });
}

/** Tenant-scoped role: must have organizationId */
async function ensureOrgAdminRole(organizationId: string) {
  const role = await prisma.role.findFirst({
    where: { organizationId, key: ORG_ADMIN_ROLE_KEY },
  });

  if (role) {
    return prisma.role.update({
      where: { id: role.id },
      data: {
        name: ORG_ADMIN_ROLE_NAME,
        scope: ORG_ADMIN_ROLE_SCOPE,
        isSystem: false,
      },
    });
  }

  return prisma.role.create({
    data: {
      organizationId,
      name: ORG_ADMIN_ROLE_NAME,
      key: ORG_ADMIN_ROLE_KEY,
      scope: ORG_ADMIN_ROLE_SCOPE,
      isSystem: false,
    },
  });
}

async function ensurePermissions() {
  return Promise.all(
    PERMISSIONS.map((permission) =>
      prisma.permission.upsert({
        where: { key: permission.key },
        update: { name: permission.name },
        create: permission,
      }),
    ),
  );
}

async function ensureRolePermissions(roleId: string, permissions: Array<{ id: string }>) {
  await Promise.all(
    permissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId,
          permissionId: permission.id,
        },
      }),
    ),
  );
}

async function ensureUserRoleAssignment(
  userId: string,
  organizationId: string,
  roleId: string,
) {
  const assignment = await prisma.userRoleAssignment.findFirst({
    where: {
      userId,
      organizationId,
      roleId,
      brandId: null,
      locationId: null,
    },
  });

  if (assignment) {
    return assignment;
  }

  return prisma.userRoleAssignment.create({
    data: {
      userId,
      organizationId,
      roleId,
    },
  });
}

/** Replace all org assignments for user with a single role assignment */
async function setUserRoleInOrg(
  userId: string,
  organizationId: string,
  roleId: string,
) {
  await prisma.userRoleAssignment.deleteMany({
    where: { userId, organizationId },
  });
  return prisma.userRoleAssignment.create({
    data: { userId, organizationId, roleId },
  });
}

/** Dev-only: ensure one test ChecklistRun exists for Demo Org (uses or creates published template) */
async function ensureTestChecklistRun(organizationId: string) {
  let template = await prisma.checklistTemplate.findFirst({
    where: { organizationId, status: 'PUBLISHED' },
    include: { sections: { include: { items: true }, orderBy: { sortOrder: 'asc' } } },
  });

  if (!template) {
    const created = await prisma.checklistTemplate.create({
      data: {
        organizationId,
        templateKey: 'test-checklist',
        version: 1,
        name: 'Test Checklist',
        description: 'Dev test template',
        status: 'PUBLISHED',
        isLatest: true,
        publishedAt: new Date(),
      },
    });
    const section = await prisma.checklistTemplateSection.create({
      data: {
        organizationId,
        checklistTemplateId: created.id,
        title: 'Checks',
        sortOrder: 0,
      },
    });
    await prisma.checklistTemplateItem.createMany({
      data: [
        {
          organizationId,
          checklistTemplateId: created.id,
          checklistTemplateSectionId: section.id,
          itemType: 'BOOLEAN',
          label: 'Item 1',
          isRequired: true,
          requiresEvidenceOnFail: false,
          requiresCommentOnFail: false,
          severity: 'MEDIUM',
          failureCreatesIncident: false,
          sortOrder: 0,
        },
        {
          organizationId,
          checklistTemplateId: created.id,
          checklistTemplateSectionId: section.id,
          itemType: 'TEXT',
          label: 'Item 2',
          isRequired: false,
          requiresEvidenceOnFail: false,
          requiresCommentOnFail: false,
          severity: 'MEDIUM',
          failureCreatesIncident: false,
          sortOrder: 1,
        },
      ],
    });
    template = await prisma.checklistTemplate.findFirstOrThrow({
      where: { id: created.id },
      include: { sections: { include: { items: true }, orderBy: { sortOrder: 'asc' } } },
    });
  }

  const existingRun = await prisma.checklistRun.findFirst({
    where: { organizationId, checklistTemplateId: template.id },
  });
  if (existingRun) return;

  const maxRun = await prisma.checklistRun.aggregate({
    where: { organizationId },
    _max: { runNumber: true },
  });
  const runNumber = (maxRun._max.runNumber ?? 0) + 1;

  const now = new Date();
  const run = await prisma.checklistRun.create({
    data: {
      organizationId,
      checklistTemplateId: template.id,
      checklistScheduleId: null,
      runSource: 'MANUAL',
      status: 'PENDING',
      dueAt: now,
      runNumber,
      templateVersion: template.version,
      templateKeySnapshot: template.templateKey,
      templateNameSnapshot: template.name,
    },
  });

  const sectionSnapshot = await prisma.checklistRunSectionSnapshot.create({
    data: {
      organizationId,
      checklistRunId: run.id,
      checklistTemplateSectionId: template.sections[0]?.id ?? null,
      titleSnapshot: template.sections[0]?.title ?? 'Checks',
      sortOrder: 0,
    },
  });

  const items = template.sections[0]?.items ?? [];
  await prisma.checklistRunItemSnapshot.createMany({
    data: [
      {
        organizationId,
        checklistRunId: run.id,
        checklistRunSectionSnapshotId: sectionSnapshot.id,
        checklistTemplateItemId: items[0]?.id ?? null,
        itemTypeSnapshot: items[0]?.itemType ?? 'BOOLEAN',
        labelSnapshot: items[0]?.label ?? 'Item 1',
        isRequiredSnapshot: items[0]?.isRequired ?? true,
        requiresEvidenceOnFailSnapshot: items[0]?.requiresEvidenceOnFail ?? false,
        requiresCommentOnFailSnapshot: items[0]?.requiresCommentOnFail ?? false,
        severitySnapshot: items[0]?.severity ?? 'MEDIUM',
        failureCreatesIncidentSnapshot: items[0]?.failureCreatesIncident ?? false,
        sortOrder: 0,
      },
      {
        organizationId,
        checklistRunId: run.id,
        checklistRunSectionSnapshotId: sectionSnapshot.id,
        checklistTemplateItemId: items[1]?.id ?? null,
        itemTypeSnapshot: items[1]?.itemType ?? 'TEXT',
        labelSnapshot: items[1]?.label ?? 'Item 2',
        isRequiredSnapshot: items[1]?.isRequired ?? false,
        requiresEvidenceOnFailSnapshot: items[1]?.requiresEvidenceOnFail ?? false,
        requiresCommentOnFailSnapshot: items[1]?.requiresCommentOnFail ?? false,
        severitySnapshot: items[1]?.severity ?? 'MEDIUM',
        failureCreatesIncidentSnapshot: items[1]?.failureCreatesIncident ?? false,
        sortOrder: 1,
      },
    ],
  });

  console.log(`Test checklist run created: ${run.id}`);
}

/** Dev-only: ensure one test ChecklistSchedule exists for generate-run testing */
async function ensureTestSchedule(organizationId: string) {
  const template = await prisma.checklistTemplate.findFirst({
    where: { organizationId, status: 'PUBLISHED' },
  });
  if (!template) return;

  const existing = await prisma.checklistSchedule.findFirst({
    where: { organizationId, checklistTemplateId: template.id },
  });
  if (existing) return;

  await prisma.checklistSchedule.create({
    data: {
      organizationId,
      checklistTemplateId: template.id,
      name: 'Daily Test Schedule',
      timezone: 'America/New_York',
      rrule: 'FREQ=DAILY;BYHOUR=6;BYMINUTE=0',
      isActive: true,
    },
  });
  console.log('Test checklist schedule created');
}

/** Ensure checklist.run.generate is assigned to Super Admin and Org Admin (idempotent) */
async function ensureChecklistRunGenerateAssigned(
  superAdminRoleId: string,
  orgAdminRoleId: string,
) {
  const perm = await prisma.permission.upsert({
    where: { key: 'checklist.run.generate' },
    update: { name: 'Generate checklist runs from schedules' },
    create: {
      key: 'checklist.run.generate',
      name: 'Generate checklist runs from schedules',
    },
  });
  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: { roleId: superAdminRoleId, permissionId: perm.id },
    },
    create: { roleId: superAdminRoleId, permissionId: perm.id },
    update: {},
  });
  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: { roleId: orgAdminRoleId, permissionId: perm.id },
    },
    create: { roleId: orgAdminRoleId, permissionId: perm.id },
    update: {},
  });
}

/** Platform user: remove ALL assignments, then assign only Super Admin in Demo Org */
async function setPlatformUserToSuperAdmin(
  userId: string,
  organizationId: string,
  roleId: string,
) {
  await prisma.userRoleAssignment.deleteMany({ where: { userId } });
  return prisma.userRoleAssignment.create({
    data: { userId, organizationId, roleId },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_USER_PASSWORD, 10);
  const orgAdminPasswordHash = await bcrypt.hash(ORG_ADMIN_USER_PASSWORD, 10);
  const organization = await ensureOrganization();
  const permissions = await ensurePermissions();

  // Super Admin: platform/global role (organizationId = null), all permissions
  const superAdminRole = await ensureSuperAdminRole();
  await ensureRolePermissions(superAdminRole.id, permissions);

  // admin@example.com → Super Admin (platform-level testing)
  // Remove ALL assignments (including stale org_admin in other orgs), then assign only Super Admin
  const superAdminUser = await ensureUser(
    DEMO_USER_EMAIL,
    DEMO_USER_NAME,
    passwordHash,
  );
  await setPlatformUserToSuperAdmin(
    superAdminUser.id,
    organization.id,
    superAdminRole.id,
  );

  // Org Admin: tenant-scoped role, all permissions
  const orgAdminRole = await ensureOrgAdminRole(organization.id);
  await ensureRolePermissions(orgAdminRole.id, permissions);

  // Explicitly ensure checklist.run.generate is assigned (handles stale compiled seed)
  await ensureChecklistRunGenerateAssigned(superAdminRole.id, orgAdminRole.id);

  // org-admin@example.com → Org Admin (tenant-scoped testing)
  const orgAdminUser = await ensureUser(
    ORG_ADMIN_USER_EMAIL,
    ORG_ADMIN_USER_NAME,
    orgAdminPasswordHash,
  );
  await setUserRoleInOrg(orgAdminUser.id, organization.id, orgAdminRole.id);

  // Dev-only: one test ChecklistRun for manual endpoint testing
  await ensureTestChecklistRun(organization.id);
  // Dev-only: one test ChecklistSchedule for generate-run testing
  await ensureTestSchedule(organization.id);

  console.log(`Seed complete`);
  console.log(`Organization: ${organization.name}`);
  console.log(`Platform user: ${DEMO_USER_EMAIL} (Super Admin)`);
  console.log(`Tenant user: ${ORG_ADMIN_USER_EMAIL} (Org Admin)`);
  console.log(`Permissions: ${permissions.length}`);
}

main()
  .catch((error) => {
    console.error('Seed failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
