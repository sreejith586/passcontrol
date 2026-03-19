import { PrismaClient, ChecklistItemSeverity } from '@prisma/client';
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
  { key: 'alert.assign', name: 'Assign and unassign alert events' },
  { key: 'alert.sla-policy.view', name: 'View alert SLA policies' },
  { key: 'alert.sla-policy.manage', name: 'Manage alert SLA policies' },
  { key: 'alert.workflow-policy.view', name: 'View alert workflow policy settings' },
  { key: 'alert.workflow-policy.manage', name: 'Manage alert workflow policy settings' },
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

/**
 * Dev-only: Create realistic demo data for local development/testing.
 * Idempotent: skips if demo template already exists.
 */
async function ensureDemoData(
  organizationId: string,
  userId: string,
) {
  const existingDemo = await prisma.checklistTemplate.findFirst({
    where: { organizationId, templateKey: 'demo-opening' },
  });
  if (existingDemo) {
    console.log('Demo data already exists, skipping');
    return;
  }

  // Enable org workflow settings for note enforcement
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      requireResolutionNoteOnResolve: true,
      requireReopenNoteOnReopen: true,
    },
  });

  // Create SLA policies for severity-based SLA
  await prisma.alertSlaPolicy.createMany({
    data: [
      { organizationId, severity: 'LOW', acknowledgeWithinMinutes: 120, resolveWithinMinutes: 480 },
      { organizationId, severity: 'MEDIUM', acknowledgeWithinMinutes: 60, resolveWithinMinutes: 240 },
      { organizationId, severity: 'HIGH', acknowledgeWithinMinutes: 30, resolveWithinMinutes: 120 },
      { organizationId, severity: 'CRITICAL', acknowledgeWithinMinutes: 15, resolveWithinMinutes: 60 },
    ],
  });

  // Template: Opening Checklist
  const openingTemplate = await prisma.checklistTemplate.create({
    data: {
      organizationId,
      templateKey: 'demo-opening',
      version: 1,
      name: 'Opening Checklist',
      description: 'Daily opening procedures',
      status: 'PUBLISHED',
      isLatest: true,
      publishedAt: new Date(),
    },
  });
  const openingSection = await prisma.checklistTemplateSection.create({
    data: {
      organizationId,
      checklistTemplateId: openingTemplate.id,
      title: 'Pre-open',
      sortOrder: 0,
    },
  });
  const openingItems = await Promise.all([
    prisma.checklistTemplateItem.create({
      data: {
        organizationId,
        checklistTemplateId: openingTemplate.id,
        checklistTemplateSectionId: openingSection.id,
        itemType: 'BOOLEAN',
        label: 'Temperature within range',
        isRequired: true,
        severity: 'CRITICAL',
        sortOrder: 0,
      },
    }),
    prisma.checklistTemplateItem.create({
      data: {
        organizationId,
        checklistTemplateId: openingTemplate.id,
        checklistTemplateSectionId: openingSection.id,
        itemType: 'BOOLEAN',
        label: 'Equipment checked',
        isRequired: true,
        severity: 'HIGH',
        sortOrder: 1,
      },
    }),
  ]);

  // Template: Safety Checklist
  const safetyTemplate = await prisma.checklistTemplate.create({
    data: {
      organizationId,
      templateKey: 'demo-safety',
      version: 1,
      name: 'Safety Inspection',
      description: 'Weekly safety checks',
      status: 'PUBLISHED',
      isLatest: true,
      publishedAt: new Date(),
    },
  });
  const safetySection = await prisma.checklistTemplateSection.create({
    data: {
      organizationId,
      checklistTemplateId: safetyTemplate.id,
      title: 'Inspections',
      sortOrder: 0,
    },
  });
  await prisma.checklistTemplateItem.create({
    data: {
      organizationId,
      checklistTemplateId: safetyTemplate.id,
      checklistTemplateSectionId: safetySection.id,
      itemType: 'BOOLEAN',
      label: 'Fire extinguisher accessible',
      isRequired: true,
      severity: 'HIGH',
      sortOrder: 0,
    },
  });

  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const maxRun = await prisma.checklistRun.aggregate({
    where: { organizationId },
    _max: { runNumber: true },
  });
  let runNumber = (maxRun._max.runNumber ?? 0) + 1;

  async function createRunWithFailedItem(
    template: { id: string; templateKey: string; name: string },
    section: { id: string; title: string },
    item: { id: string; label: string; severity: string },
    status: string,
    dueAt: Date,
  ) {
    const run = await prisma.checklistRun.create({
      data: {
        organizationId,
        checklistTemplateId: template.id,
        runSource: 'MANUAL',
        status,
        dueAt,
        runNumber: runNumber++,
        templateVersion: 1,
        templateKeySnapshot: template.templateKey,
        templateNameSnapshot: template.name,
        startedAt: status !== 'PENDING' ? dueAt : null,
        completedAt: status === 'COMPLETED' ? new Date(dueAt.getTime() + 30 * 60 * 1000) : null,
        performedByUserId: status === 'COMPLETED' ? userId : null,
      },
    });
    const sectionSnap = await prisma.checklistRunSectionSnapshot.create({
      data: {
        organizationId,
        checklistRunId: run.id,
        checklistTemplateSectionId: section.id,
        titleSnapshot: section.title,
        sortOrder: 0,
      },
    });
    const passItem = await prisma.checklistRunItemSnapshot.create({
      data: {
        organizationId,
        checklistRunId: run.id,
        checklistRunSectionSnapshotId: sectionSnap.id,
        checklistTemplateItemId: item.id,
        itemTypeSnapshot: 'BOOLEAN',
        labelSnapshot: 'Dummy pass item',
        isRequiredSnapshot: true,
        requiresEvidenceOnFailSnapshot: false,
        requiresCommentOnFailSnapshot: false,
        severitySnapshot: 'LOW',
        failureCreatesIncidentSnapshot: false,
        sortOrder: 0,
        result: 'PASS',
        respondedAt: status === 'COMPLETED' ? run.completedAt : null,
        respondedByUserId: status === 'COMPLETED' ? userId : null,
      },
    });
    const failItem = await prisma.checklistRunItemSnapshot.create({
      data: {
        organizationId,
        checklistRunId: run.id,
        checklistRunSectionSnapshotId: sectionSnap.id,
        checklistTemplateItemId: item.id,
        itemTypeSnapshot: 'BOOLEAN',
        labelSnapshot: item.label,
        isRequiredSnapshot: true,
        requiresEvidenceOnFailSnapshot: false,
        requiresCommentOnFailSnapshot: false,
        severitySnapshot: item.severity as ChecklistItemSeverity,
        failureCreatesIncidentSnapshot: false,
        sortOrder: 1,
        result: 'FAIL',
        comment: 'Out of acceptable range',
        respondedAt: status === 'COMPLETED' ? run.completedAt : null,
        respondedByUserId: status === 'COMPLETED' ? userId : null,
      },
    });
    return { run, failItem };
  }

  const openingTemplateWithKey = { ...openingTemplate, templateKey: 'demo-opening' };
  const safetyTemplateWithKey = { ...safetyTemplate, templateKey: 'demo-safety' };

  // Run 1: OPEN alert
  const { failItem: fail1 } = await createRunWithFailedItem(
    openingTemplateWithKey,
    openingSection,
    openingItems[0],
    'COMPLETED',
    twoHoursAgo,
  );
  const alertOpen = await prisma.alertEvent.create({
    data: {
      organizationId,
      sourceType: 'CHECKLIST_RUN_ITEM',
      sourceId: fail1.id,
      type: 'CHECKLIST_ITEM_FAIL',
      status: 'OPEN',
      severity: 'CRITICAL',
      acknowledgeWithinMinutes: 15,
      resolveWithinMinutes: 60,
      payloadJson: {
        runId: fail1.checklistRunId,
        label: openingItems[0].label,
        severity: 'CRITICAL',
        result: 'FAIL',
      },
      triggeredAt: twoHoursAgo,
    },
  });
  await prisma.alertEventActivity.create({
    data: {
      organizationId,
      alertEventId: alertOpen.id,
      type: 'CREATED',
      toStatus: 'OPEN',
    },
  });
  await prisma.alertEventComment.create({
    data: {
      organizationId,
      alertEventId: alertOpen.id,
      type: 'COMMENT',
      body: 'Investigating the temperature reading.',
      authorUserId: userId,
    },
  });

  // Run 2: ACKNOWLEDGED alert
  const { failItem: fail2 } = await createRunWithFailedItem(
    openingTemplateWithKey,
    openingSection,
    openingItems[1],
    'COMPLETED',
    yesterday,
  );
  const alertAck = await prisma.alertEvent.create({
    data: {
      organizationId,
      sourceType: 'CHECKLIST_RUN_ITEM',
      sourceId: fail2.id,
      type: 'CHECKLIST_ITEM_FAIL',
      status: 'ACKNOWLEDGED',
      severity: 'HIGH',
      acknowledgeWithinMinutes: 30,
      resolveWithinMinutes: 120,
      payloadJson: {
        runId: fail2.checklistRunId,
        label: openingItems[1].label,
        severity: 'HIGH',
        result: 'FAIL',
      },
      triggeredAt: yesterday,
      acknowledgedAt: new Date(yesterday.getTime() + 15 * 60 * 1000),
      acknowledgedByUserId: userId,
    },
  });
  await prisma.alertEventActivity.createMany({
    data: [
      { organizationId, alertEventId: alertAck.id, type: 'CREATED', toStatus: 'OPEN' },
      {
        organizationId,
        alertEventId: alertAck.id,
        type: 'ACKNOWLEDGED',
        fromStatus: 'OPEN',
        toStatus: 'ACKNOWLEDGED',
        actorUserId: userId,
      },
    ],
  });

  // Run 3: RESOLVED alert (with resolution note)
  const { failItem: fail3 } = await createRunWithFailedItem(
    openingTemplateWithKey,
    openingSection,
    openingItems[0],
    'COMPLETED',
    yesterday,
  );
  const alertResolved = await prisma.alertEvent.create({
    data: {
      organizationId,
      sourceType: 'CHECKLIST_RUN_ITEM',
      sourceId: fail3.id,
      type: 'CHECKLIST_ITEM_FAIL',
      status: 'RESOLVED',
      severity: 'MEDIUM',
      acknowledgeWithinMinutes: 60,
      resolveWithinMinutes: 240,
      payloadJson: {
        runId: fail3.checklistRunId,
        label: openingItems[0].label,
        severity: 'MEDIUM',
        result: 'FAIL',
      },
      triggeredAt: yesterday,
      acknowledgedAt: new Date(yesterday.getTime() + 20 * 60 * 1000),
      acknowledgedByUserId: userId,
      resolvedAt: new Date(yesterday.getTime() + 45 * 60 * 1000),
      resolvedByUserId: userId,
      resolutionNote: 'Equipment recalibrated. Verified within spec.',
    },
  });
  await prisma.alertEventActivity.createMany({
    data: [
      { organizationId, alertEventId: alertResolved.id, type: 'CREATED', toStatus: 'OPEN' },
      {
        organizationId,
        alertEventId: alertResolved.id,
        type: 'ACKNOWLEDGED',
        fromStatus: 'OPEN',
        toStatus: 'ACKNOWLEDGED',
        actorUserId: userId,
      },
      {
        organizationId,
        alertEventId: alertResolved.id,
        type: 'RESOLVED',
        fromStatus: 'ACKNOWLEDGED',
        toStatus: 'RESOLVED',
        actorUserId: userId,
        comment: 'Equipment recalibrated. Verified within spec.',
      },
    ],
  });
  await prisma.alertEventComment.create({
    data: {
      organizationId,
      alertEventId: alertResolved.id,
      type: 'RESOLUTION_NOTE',
      body: 'Equipment recalibrated. Verified within spec.',
      authorUserId: userId,
    },
  });

  // Run 4: RESOLVED then REOPENED (now OPEN with reopen history)
  const { failItem: fail4 } = await createRunWithFailedItem(
    openingTemplateWithKey,
    openingSection,
    openingItems[1],
    'COMPLETED',
    yesterday,
  );
  const alertReopened = await prisma.alertEvent.create({
    data: {
      organizationId,
      sourceType: 'CHECKLIST_RUN_ITEM',
      sourceId: fail4.id,
      type: 'CHECKLIST_ITEM_FAIL',
      status: 'OPEN',
      severity: 'HIGH',
      acknowledgeWithinMinutes: 30,
      resolveWithinMinutes: 120,
      payloadJson: {
        runId: fail4.checklistRunId,
        label: openingItems[1].label,
        severity: 'HIGH',
        result: 'FAIL',
      },
      triggeredAt: yesterday,
    },
  });
  await prisma.alertEventActivity.createMany({
    data: [
      { organizationId, alertEventId: alertReopened.id, type: 'CREATED', toStatus: 'OPEN' },
      {
        organizationId,
        alertEventId: alertReopened.id,
        type: 'ACKNOWLEDGED',
        fromStatus: 'OPEN',
        toStatus: 'ACKNOWLEDGED',
        actorUserId: userId,
      },
      {
        organizationId,
        alertEventId: alertReopened.id,
        type: 'RESOLVED',
        fromStatus: 'ACKNOWLEDGED',
        toStatus: 'RESOLVED',
        actorUserId: userId,
      },
      {
        organizationId,
        alertEventId: alertReopened.id,
        type: 'REOPENED',
        fromStatus: 'RESOLVED',
        toStatus: 'OPEN',
        actorUserId: userId,
      },
    ],
  });
  await prisma.alertEventComment.create({
    data: {
      organizationId,
      alertEventId: alertReopened.id,
      type: 'REOPEN_NOTE',
      body: 'Issue recurred after initial fix. Reopening for follow-up.',
      authorUserId: userId,
    },
  });

  // Run 5: SLA-breached OPEN alert (triggered long ago)
  const breachedAt = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const { failItem: fail5 } = await createRunWithFailedItem(
    openingTemplateWithKey,
    openingSection,
    openingItems[0],
    'COMPLETED',
    breachedAt,
  );
  const alertBreached = await prisma.alertEvent.create({
    data: {
      organizationId,
      sourceType: 'CHECKLIST_RUN_ITEM',
      sourceId: fail5.id,
      type: 'CHECKLIST_ITEM_FAIL',
      status: 'OPEN',
      severity: 'CRITICAL',
      acknowledgeWithinMinutes: 15,
      resolveWithinMinutes: 60,
      payloadJson: {
        runId: fail5.checklistRunId,
        label: openingItems[0].label,
        severity: 'CRITICAL',
        result: 'FAIL',
      },
      triggeredAt: breachedAt,
    },
  });
  await prisma.alertEventActivity.create({
    data: {
      organizationId,
      alertEventId: alertBreached.id,
      type: 'CREATED',
      toStatus: 'OPEN',
    },
  });

  // Run 6: Overdue PENDING run (for dashboard)
  await createRunWithFailedItem(
    openingTemplateWithKey,
    openingSection,
    openingItems[0],
    'PENDING',
    yesterday,
  );

  // Run 7: Overdue PENDING run
  const safetyItem = await prisma.checklistTemplateItem.findFirstOrThrow({
    where: { checklistTemplateId: safetyTemplate.id },
  });
  await createRunWithFailedItem(
    safetyTemplateWithKey,
    safetySection,
    { id: safetyItem.id, label: safetyItem.label, severity: safetyItem.severity },
    'PENDING',
    twoHoursAgo,
  );

  console.log('Demo data created: templates, runs, alerts (OPEN/ACK/RESOLVED/reopened/SLA-breached), comments, org workflow settings');
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
  // Dev-only: realistic demo data for frontend exercise
  await ensureDemoData(organization.id, superAdminUser.id);

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
