"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const client_1 = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new client_1.PrismaClient();
/** Base path for uploads; must match MockStorageService (UPLOADS_DIR ?? './uploads'). */
const UPLOADS_BASE = process.env.UPLOADS_DIR ?? './uploads';
/** Minimal valid 1x1 pixel JPEG (~134 bytes) for demo evidence placeholders. */
const MINIMAL_JPEG = Buffer.from('ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffdb0043010909090c0b0c190d0d0c321c1c323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232ffd9', 'hex');
const DEMO_ORGANIZATION_NAME = 'Demo Org';
/** Template keys that define the demo dataset. Used for gating and reset. */
const DEMO_TEMPLATE_KEYS = [
    'demo-opening',
    'demo-closing',
    'demo-cold-storage',
    'demo-food-safety',
    'demo-receiving',
    'demo-equipment',
];
/** When true, deletes demo transactional data and templates, then recreates them. */
const SEED_RESET_DEMO = process.env.SEED_RESET_DEMO === 'true';
const DEMO_USER_NAME = 'Demo Admin';
const DEMO_USER_EMAIL = 'admin@example.com';
const DEMO_USER_PASSWORD = 'Password123!';
const SUPER_ADMIN_ROLE_NAME = 'Super Admin';
const SUPER_ADMIN_ROLE_KEY = 'super_admin';
const SUPER_ADMIN_ROLE_SCOPE = 'ORGANIZATION';
const ORG_ADMIN_USER_EMAIL = 'org-admin@example.com';
const ORG_ADMIN_USER_NAME = 'Org Admin';
const ORG_ADMIN_USER_PASSWORD = 'Password123!';
/** Additional demo users (beyond admin/org-admin). roleKey = org-scoped role. */
const DEMO_EXTRA_USERS = [
    { email: 'ops@example.com', name: 'Maria Santos', roleKey: 'restaurant_manager' },
    { email: 'area@example.com', name: 'James Chen', roleKey: 'area_manager' },
    { email: 'qa@example.com', name: 'Sarah Williams', roleKey: 'kitchen_supervisor' },
    { email: 'supervisor@example.com', name: 'David Kim', roleKey: 'kitchen_supervisor' },
    { email: 'shift1@example.com', name: 'Elena Rodriguez', roleKey: 'shift_lead' },
    { email: 'shift2@example.com', name: 'Marcus Johnson', roleKey: 'shift_lead' },
    { email: 'staff1@example.com', name: 'Omar Hassan', roleKey: 'operator' },
    { email: 'staff2@example.com', name: 'Lisa Park', roleKey: 'operator' },
    { email: 'viewer@example.com', name: 'Tom Baker', roleKey: 'viewer' },
];
const PERMISSIONS = [
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
    { key: 'user.view', name: 'View users and roles' },
    { key: 'user.invite', name: 'Invite users to organization' },
    { key: 'user.manage', name: 'Manage user roles and status' },
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
/** Demo org structure: 1 brand, 2 locations, 2 zones per location. Idempotent. */
async function ensureDemoOrgStructure(organizationId) {
    let brand = await prisma.brand.findFirst({
        where: { organizationId, name: 'PassControl Kitchen' },
        include: { locations: { include: { zones: true } } },
    });
    if (!brand) {
        brand = await prisma.brand.create({
            data: { organizationId, name: 'PassControl Kitchen' },
            include: { locations: { include: { zones: true } } },
        });
    }
    const existingLocationNames = new Set((await prisma.location.findMany({ where: { brandId: brand.id }, select: { name: true } })).map((l) => l.name));
    const locationsToCreate = [
        { name: 'Downtown Branch', timezone: 'America/New_York', zones: ['Prep', 'Service'] },
        { name: 'Airport Hub', timezone: 'America/New_York', zones: ['Cold Storage', 'Hot Line'] },
        { name: 'City Center', timezone: 'America/New_York', zones: ['Back of House', 'Expo'] },
    ];
    for (const loc of locationsToCreate) {
        if (existingLocationNames.has(loc.name))
            continue;
        const location = await prisma.location.create({
            data: {
                organizationId,
                brandId: brand.id,
                name: loc.name,
                timezone: loc.timezone,
            },
        });
        for (let i = 0; i < loc.zones.length; i++) {
            await prisma.zone.create({
                data: {
                    organizationId,
                    locationId: location.id,
                    name: loc.zones[i],
                },
            });
        }
    }
    const locations = await prisma.location.findMany({
        where: { brandId: brand.id },
        include: { zones: true },
    });
    return { brand, locations };
}
async function ensureUser(email, name, passwordHash) {
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
async function ensurePermissions() {
    return Promise.all(PERMISSIONS.map((permission) => prisma.permission.upsert({
        where: { key: permission.key },
        update: { name: permission.name },
        create: permission,
    })));
}
async function ensureRolePermissions(roleId, permissions) {
    await Promise.all(permissions.map((permission) => prisma.rolePermission.upsert({
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
    })));
}
/** Replace role permissions with the given set (for idempotent re-seed). */
async function setRolePermissions(roleId, permissions) {
    await prisma.rolePermission.deleteMany({ where: { roleId } });
    if (permissions.length > 0) {
        await prisma.rolePermission.createMany({
            data: permissions.map((p) => ({ roleId, permissionId: p.id })),
            skipDuplicates: true,
        });
    }
}
/** Ensure org-scoped role by key. Returns role. */
async function ensureOrgScopedRole(organizationId, key, name) {
    const role = await prisma.role.findFirst({
        where: { organizationId, key },
    });
    if (role) {
        return prisma.role.update({
            where: { id: role.id },
            data: { name, scope: 'ORGANIZATION', isSystem: false },
        });
    }
    return prisma.role.create({
        data: {
            organizationId,
            name,
            key,
            scope: 'ORGANIZATION',
            isSystem: false,
        },
    });
}
/**
 * Restaurant-relevant role definitions.
 * Permission keys mapped to each role (least to most privilege).
 */
const RESTAURANT_ROLES = [
    {
        key: 'viewer',
        name: 'Viewer',
        permissionKeys: [
            'checklist.template.view',
            'checklist.schedule.view',
            'checklist.run.view',
            'alert.view',
            'temperature.reading.view',
            'temperature.policy.view',
            'file.view',
            'attachment.view',
        ],
    },
    {
        key: 'auditor',
        name: 'Auditor',
        permissionKeys: [
            'checklist.template.view',
            'checklist.schedule.view',
            'checklist.run.view',
            'alert.view',
            'temperature.reading.view',
            'temperature.policy.view',
            'file.view',
            'attachment.view',
        ],
    },
    {
        key: 'operator',
        name: 'Operator',
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
    {
        key: 'shift_lead',
        name: 'Shift Lead',
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
        key: 'kitchen_supervisor',
        name: 'Kitchen Supervisor',
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
            'temperature.reading.create',
            'temperature.reading.view',
            'temperature.policy.view',
            'temperature.policy.update',
            'file.view',
            'attachment.view',
            'attachment.create',
        ],
    },
    {
        key: 'restaurant_manager',
        name: 'Restaurant Manager',
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
        ],
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
        ],
    },
    {
        key: 'org_admin',
        name: 'Org Admin',
        permissionKeys: PERMISSIONS.map((p) => p.key),
    },
];
async function ensureUserRoleAssignment(userId, organizationId, roleId) {
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
async function setUserRoleInOrg(userId, organizationId, roleId) {
    await prisma.userRoleAssignment.deleteMany({
        where: { userId, organizationId },
    });
    return prisma.userRoleAssignment.create({
        data: { userId, organizationId, roleId },
    });
}
/** Ensure demo users exist and have org roles. Idempotent. */
async function ensureDemoUsers(organizationId, passwordHash) {
    const roleCache = {};
    async function getRoleId(key) {
        if (!roleCache[key]) {
            const r = await prisma.role.findFirst({ where: { organizationId, key }, select: { id: true } });
            if (!r)
                throw new Error(`Role ${key} not found`);
            roleCache[key] = r.id;
        }
        return roleCache[key];
    }
    for (const u of DEMO_EXTRA_USERS) {
        const user = await ensureUser(u.email, u.name, passwordHash);
        const roleId = await getRoleId(u.roleKey);
        await setUserRoleInOrg(user.id, organizationId, roleId);
    }
}
/**
 * Check whether the demo dataset already exists.
 * Demo data is present if any template with a demo template key exists.
 */
async function demoDataExists(organizationId) {
    const count = await prisma.checklistTemplate.count({
        where: {
            organizationId,
            templateKey: { in: [...DEMO_TEMPLATE_KEYS] },
        },
    });
    return count > 0;
}
/**
 * Ensure AlertSlaPolicy records for demo org. Idempotent: creates only missing severities.
 */
async function ensureDemoSlaPolicies(organizationId) {
    const SEVERITIES = [
        { severity: 'LOW', acknowledgeWithinMinutes: 120, resolveWithinMinutes: 480 },
        { severity: 'MEDIUM', acknowledgeWithinMinutes: 60, resolveWithinMinutes: 240 },
        { severity: 'HIGH', acknowledgeWithinMinutes: 30, resolveWithinMinutes: 120 },
        { severity: 'CRITICAL', acknowledgeWithinMinutes: 15, resolveWithinMinutes: 60 },
    ];
    const existing = await prisma.alertSlaPolicy.findMany({
        where: { organizationId },
        select: { severity: true },
    });
    const existingSeverities = new Set(existing.map((p) => p.severity));
    const toCreate = SEVERITIES.filter((s) => !existingSeverities.has(s.severity));
    if (toCreate.length > 0) {
        await prisma.alertSlaPolicy.createMany({
            data: toCreate.map((s) => ({
                organizationId,
                severity: s.severity,
                acknowledgeWithinMinutes: s.acknowledgeWithinMinutes,
                resolveWithinMinutes: s.resolveWithinMinutes,
            })),
        });
    }
}
/**
 * Delete all demo-related transactional data and demo templates for the demo organization.
 * Used only when SEED_RESET_DEMO=true.
 * Deletes: demo templates (and sections, items), runs (and snapshots), alerts (and activities, comments),
 * schedules for demo templates, attachments on demo run items, and demo SLA policies.
 */
async function deleteDemoData(organizationId) {
    const demoTemplates = await prisma.checklistTemplate.findMany({
        where: { organizationId, templateKey: { in: [...DEMO_TEMPLATE_KEYS] } },
        select: { id: true },
    });
    const demoTemplateIds = demoTemplates.map((t) => t.id);
    if (demoTemplateIds.length === 0) {
        console.log('No demo templates to delete');
        return;
    }
    const demoRuns = await prisma.checklistRun.findMany({
        where: { checklistTemplateId: { in: demoTemplateIds } },
        select: { id: true },
    });
    const demoRunIds = demoRuns.map((r) => r.id);
    const demoItemSnapshots = await prisma.checklistRunItemSnapshot.findMany({
        where: { checklistRunId: { in: demoRunIds } },
        select: { id: true },
    });
    const demoItemSnapshotIds = demoItemSnapshots.map((i) => i.id);
    const demoAlerts = await prisma.alertEvent.findMany({
        where: {
            organizationId,
            sourceType: 'CHECKLIST_RUN_ITEM',
            sourceId: { in: demoItemSnapshotIds },
        },
        select: { id: true },
    });
    const demoAlertIds = demoAlerts.map((a) => a.id);
    const demoAttachments = await prisma.attachment.findMany({
        where: { checklistRunItemSnapshotId: { in: demoItemSnapshotIds } },
        select: { fileId: true },
    });
    const demoFileIds = [...new Set(demoAttachments.map((a) => a.fileId))];
    // Delete in dependency order (children first)
    await prisma.alertEventComment.deleteMany({ where: { alertEventId: { in: demoAlertIds } } });
    await prisma.alertEventActivity.deleteMany({ where: { alertEventId: { in: demoAlertIds } } });
    await prisma.alertEvent.deleteMany({ where: { id: { in: demoAlertIds } } });
    await prisma.attachment.deleteMany({
        where: { checklistRunItemSnapshotId: { in: demoItemSnapshotIds } },
    });
    if (demoFileIds.length > 0) {
        const demoFiles = await prisma.file.findMany({
            where: { id: { in: demoFileIds } },
            select: { bucket: true, objectKey: true },
        });
        for (const f of demoFiles) {
            const fullPath = path.join(UPLOADS_BASE, f.bucket, f.objectKey);
            try {
                if (fs.existsSync(fullPath))
                    fs.unlinkSync(fullPath);
            }
            catch {
                /* ignore */
            }
        }
        await prisma.file.deleteMany({ where: { id: { in: demoFileIds } } });
    }
    await prisma.checklistRunItemSnapshot.deleteMany({ where: { checklistRunId: { in: demoRunIds } } });
    await prisma.checklistRunSectionSnapshot.deleteMany({ where: { checklistRunId: { in: demoRunIds } } });
    await prisma.checklistRun.deleteMany({ where: { id: { in: demoRunIds } } });
    await prisma.checklistSchedule.deleteMany({ where: { checklistTemplateId: { in: demoTemplateIds } } });
    const demoSections = await prisma.checklistTemplateSection.findMany({
        where: { checklistTemplateId: { in: demoTemplateIds } },
        select: { id: true },
    });
    const demoSectionIds = demoSections.map((s) => s.id);
    await prisma.checklistTemplateItem.deleteMany({ where: { checklistTemplateSectionId: { in: demoSectionIds } } });
    await prisma.checklistTemplateSection.deleteMany({ where: { checklistTemplateId: { in: demoTemplateIds } } });
    await prisma.checklistTemplate.deleteMany({ where: { id: { in: demoTemplateIds } } });
    await prisma.alertSlaPolicy.deleteMany({ where: { organizationId } });
    console.log('Demo data deleted');
}
/** Dev-only: ensure one test ChecklistRun exists for Demo Org (uses or creates published template).
 * Skipped when richer demo data exists to avoid run-number drift and keep demo tidy. */
async function ensureTestChecklistRun(organizationId) {
    if (await demoDataExists(organizationId))
        return;
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
    if (existingRun)
        return;
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
async function ensureTestSchedule(organizationId) {
    const template = await prisma.checklistTemplate.findFirst({
        where: { organizationId, status: 'PUBLISHED' },
    });
    if (!template)
        return;
    const existing = await prisma.checklistSchedule.findFirst({
        where: { organizationId, checklistTemplateId: template.id },
    });
    if (existing)
        return;
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
async function ensureChecklistRunGenerateAssigned(superAdminRoleId, orgAdminRoleId) {
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
async function setPlatformUserToSuperAdmin(userId, organizationId, roleId) {
    await prisma.userRoleAssignment.deleteMany({ where: { userId } });
    return prisma.userRoleAssignment.create({
        data: { userId, organizationId, roleId },
    });
}
/**
 * Dev-only: Create realistic demo data for local development/testing.
 * Idempotent: skips if demo dataset already exists (any demo template key present).
 */
async function ensureDemoData(organizationId, userId) {
    if (await demoDataExists(organizationId)) {
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
    // Ensure SLA policies (idempotent: creates only missing severities)
    await ensureDemoSlaPolicies(organizationId);
    const { brand, locations } = await ensureDemoOrgStructure(organizationId);
    const loc1 = locations[0];
    const loc2 = locations[1] ?? loc1;
    async function createDemoTemplate(key, name, description, sections, locationId) {
        const template = await prisma.checklistTemplate.create({
            data: {
                organizationId,
                templateKey: key,
                version: 1,
                name,
                description,
                status: 'PUBLISHED',
                isLatest: true,
                publishedAt: new Date(),
                brandId: brand.id,
                locationId: locationId ?? null,
            },
        });
        const createdSections = [];
        for (let si = 0; si < sections.length; si++) {
            const sec = await prisma.checklistTemplateSection.create({
                data: {
                    organizationId,
                    checklistTemplateId: template.id,
                    title: sections[si].title,
                    sortOrder: si,
                },
            });
            const items = [];
            for (let ii = 0; ii < sections[si].items.length; ii++) {
                const it = sections[si].items[ii];
                const created = await prisma.checklistTemplateItem.create({
                    data: {
                        organizationId,
                        checklistTemplateId: template.id,
                        checklistTemplateSectionId: sec.id,
                        itemType: it.itemType,
                        label: it.label,
                        isRequired: it.isRequired ?? true,
                        requiresEvidenceOnFail: it.requiresEvidenceOnFail ?? false,
                        requiresCommentOnFail: it.requiresCommentOnFail ?? false,
                        severity: (it.severity ?? 'MEDIUM'),
                        configJson: (it.configJson ?? undefined),
                        sortOrder: ii,
                    },
                });
                items.push({ ...created, ...it });
            }
            createdSections.push({ id: sec.id, title: sec.title, items });
        }
        return { template, sections: createdSections };
    }
    // Template 1: Opening Checklist
    const opening = await createDemoTemplate('demo-opening', 'Opening Checklist', 'Daily opening procedures for kitchen readiness', [
        {
            title: 'Pre-open',
            items: [
                { itemType: 'BOOLEAN', label: 'Walk-in cooler temperature within 32–40°F', severity: 'CRITICAL', requiresEvidenceOnFail: true },
                { itemType: 'BOOLEAN', label: 'Prep tables sanitized and ready', severity: 'HIGH' },
                { itemType: 'CHECKBOX', label: 'All equipment power-on and operational', severity: 'HIGH', requiresCommentOnFail: true },
            ],
        },
        {
            title: 'Service readiness',
            items: [
                { itemType: 'BOOLEAN', label: 'Line stocked with mise en place', severity: 'MEDIUM' },
                { itemType: 'TEXT', label: 'Special-of-day prep notes (if any)', severity: 'LOW', isRequired: false },
            ],
        },
    ], loc1.id);
    // Template 2: Closing Checklist
    const closing = await createDemoTemplate('demo-closing', 'Closing Checklist', 'End-of-day closing and clean-down', [
        {
            title: 'Clean-down',
            items: [
                { itemType: 'BOOLEAN', label: 'All prep surfaces cleaned and sanitized', severity: 'HIGH' },
                { itemType: 'BOOLEAN', label: 'Floors swept and mopped', severity: 'MEDIUM' },
                { itemType: 'CHECKBOX', label: 'Trash and recyclables removed', severity: 'MEDIUM', requiresCommentOnFail: true },
            ],
        },
        {
            title: 'Equipment & security',
            items: [
                { itemType: 'BOOLEAN', label: 'Ovens and grills shut down and cool', severity: 'HIGH' },
                { itemType: 'BOOLEAN', label: 'Doors and locks secured', severity: 'CRITICAL' },
            ],
        },
    ], loc1.id);
    // Template 3: Cold Storage Temperature Log
    const coldStorage = await createDemoTemplate('demo-cold-storage', 'Cold Storage Temperature Log', 'Twice-daily temperature logs for cold storage units', [
        {
            title: 'Walk-in cooler',
            items: [
                { itemType: 'TEMPERATURE', label: 'Walk-in cooler ambient (°F)', severity: 'CRITICAL', requiresEvidenceOnFail: true, configJson: { unit: '°F', min: 32, max: 40 } },
                { itemType: 'TEMPERATURE', label: 'Produce drawer (°F)', severity: 'HIGH', configJson: { unit: '°F', min: 35, max: 42 } },
            ],
        },
        {
            title: 'Freezer',
            items: [
                { itemType: 'TEMPERATURE', label: 'Freezer ambient (°F)', severity: 'CRITICAL', configJson: { unit: '°F', min: -10, max: 0 } },
                { itemType: 'BOOLEAN', label: 'Door seals intact and closing properly', severity: 'MEDIUM' },
            ],
        },
    ], loc1.id);
    // Template 4: Food Safety & Hygiene Check
    const foodSafety = await createDemoTemplate('demo-food-safety', 'Food Safety & Hygiene Check', 'Weekly food safety and hygiene inspection', [
        {
            title: 'Hygiene',
            items: [
                { itemType: 'BOOLEAN', label: 'Handwashing stations stocked with soap and paper towels', severity: 'CRITICAL' },
                { itemType: 'BOOLEAN', label: 'Staff wearing appropriate PPE (hats, gloves)', severity: 'HIGH' },
                { itemType: 'CHECKBOX', label: 'No cross-contamination (raw/cooked separation)', severity: 'CRITICAL', requiresEvidenceOnFail: true },
            ],
        },
        {
            title: 'Storage & labeling',
            items: [
                { itemType: 'BOOLEAN', label: 'All items date-labeled and within shelf life', severity: 'HIGH', requiresCommentOnFail: true },
                { itemType: 'BOOLEAN', label: 'FIFO rotation practiced in cold storage', severity: 'MEDIUM' },
            ],
        },
    ], loc2.id);
    // Template 5: Receiving Inspection
    const receiving = await createDemoTemplate('demo-receiving', 'Receiving Inspection', 'Inspect and verify incoming deliveries', [
        {
            title: 'Quality & temp',
            items: [
                { itemType: 'BOOLEAN', label: 'Delivery within specified time window', severity: 'MEDIUM' },
                { itemType: 'TEMPERATURE', label: 'Chilled product temp at receipt (°F)', severity: 'CRITICAL', requiresEvidenceOnFail: true, configJson: { unit: '°F', min: 32, max: 41 } },
                { itemType: 'BOOLEAN', label: 'Packaging intact, no damage or pests', severity: 'HIGH' },
            ],
        },
        {
            title: 'Documentation',
            items: [
                { itemType: 'BOOLEAN', label: 'Invoice matches order and received quantities', severity: 'HIGH', requiresCommentOnFail: true },
                { itemType: 'TEXT', label: 'Delivery notes or issues (if any)', severity: 'LOW', isRequired: false },
            ],
        },
    ], loc2.id);
    // Template 6: Equipment Readiness Check
    const equipment = await createDemoTemplate('demo-equipment', 'Equipment Readiness Check', 'Verify key equipment is operational before service', [
        {
            title: 'Cooking equipment',
            items: [
                { itemType: 'BOOLEAN', label: 'Flat-top grill heated to service temp', severity: 'HIGH' },
                { itemType: 'BOOLEAN', label: 'Fryers at temperature and oil level OK', severity: 'HIGH', requiresCommentOnFail: true },
                { itemType: 'BOOLEAN', label: 'Ovens preheated and calibrated', severity: 'MEDIUM' },
            ],
        },
        {
            title: 'Refrigeration & HVAC',
            items: [
                { itemType: 'BOOLEAN', label: 'Refrigeration units maintaining temp', severity: 'CRITICAL', requiresEvidenceOnFail: true },
                { itemType: 'BOOLEAN', label: 'Hood and exhaust operational', severity: 'HIGH' },
            ],
        },
    ], loc2.id);
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const breachedAt = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const maxRun = await prisma.checklistRun.aggregate({
        where: { organizationId },
        _max: { runNumber: true },
    });
    let runNumber = (maxRun._max.runNumber ?? 0) + 1;
    const demoUsersById = Object.fromEntries((await prisma.user.findMany({ where: { email: { in: DEMO_EXTRA_USERS.map((u) => u.email) } }, select: { id: true, email: true } })).map((u) => [u.email, u.id]));
    const opsUserId = demoUsersById['ops@example.com'] ?? userId;
    const qaUserId = demoUsersById['qa@example.com'] ?? userId;
    async function createRunWithFailedItem(template, section, item, status, dueAt, opts) {
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
                locationId: opts?.locationId ?? null,
                brandId: opts?.brandId ?? null,
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
        const itemType = item.itemType ?? 'BOOLEAN';
        const passItem = await prisma.checklistRunItemSnapshot.create({
            data: {
                organizationId,
                checklistRunId: run.id,
                checklistRunSectionSnapshotId: sectionSnap.id,
                checklistTemplateItemId: item.id,
                itemTypeSnapshot: itemType,
                labelSnapshot: 'Item passed',
                isRequiredSnapshot: true,
                requiresEvidenceOnFailSnapshot: false,
                requiresCommentOnFailSnapshot: false,
                severitySnapshot: 'LOW',
                failureCreatesIncidentSnapshot: false,
                configSnapshotJson: (item.configJson ?? undefined),
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
                itemTypeSnapshot: itemType,
                labelSnapshot: item.label,
                isRequiredSnapshot: true,
                requiresEvidenceOnFailSnapshot: item.requiresEvidenceOnFail ?? false,
                requiresCommentOnFailSnapshot: item.requiresCommentOnFail ?? false,
                severitySnapshot: (item.severity ?? 'MEDIUM'),
                failureCreatesIncidentSnapshot: false,
                configSnapshotJson: (item.configJson ?? undefined),
                sortOrder: 1,
                result: 'FAIL',
                comment: ['TEMPERATURE', 'TEXT'].includes(itemType) ? 'Out of range / See notes' : 'Out of acceptable range',
                respondedAt: status === 'COMPLETED' ? run.completedAt : null,
                respondedByUserId: status === 'COMPLETED' ? userId : null,
            },
        });
        return { run, failItem };
    }
    function tpl(t, key) {
        return { id: t.template.id, templateKey: key, name: t.template.name };
    }
    const openSec0 = opening.sections[0];
    const openItem0 = openSec0.items[0];
    const openItem1 = openSec0.items[1];
    const closeSec0 = closing.sections[0];
    const closeItem0 = closeSec0.items[0];
    const coldSec0 = coldStorage.sections[0];
    const coldItem0 = coldSec0.items[0];
    const foodSec0 = foodSafety.sections[0];
    const foodItem0 = foodSec0.items[0];
    const recSec0 = receiving.sections[0];
    const recItem0 = recSec0.items[1];
    const eqSec0 = equipment.sections[0];
    const eqItem0 = eqSec0.items[0];
    const runOpts = { locationId: loc1.id, brandId: brand.id };
    // Helper: create alert from failed item
    async function createAlert(failItem, status, triggeredAt, opts) {
        const ack = status !== 'OPEN' ? (opts?.acknowledgedAt ?? new Date(triggeredAt.getTime() + 15 * 60 * 1000)) : undefined;
        const res = status === 'RESOLVED' ? (opts?.resolvedAt ?? new Date(triggeredAt.getTime() + 45 * 60 * 1000)) : undefined;
        const alert = await prisma.alertEvent.create({
            data: {
                organizationId,
                sourceType: 'CHECKLIST_RUN_ITEM',
                sourceId: failItem.id,
                type: 'CHECKLIST_ITEM_FAIL',
                status,
                severity: (opts?.severity ?? failItem.severitySnapshot),
                acknowledgeWithinMinutes: 15,
                resolveWithinMinutes: 60,
                payloadJson: { runId: failItem.checklistRunId, label: failItem.labelSnapshot, result: 'FAIL' },
                triggeredAt,
                acknowledgedAt: ack,
                acknowledgedByUserId: ack ? userId : undefined,
                resolvedAt: res,
                resolvedByUserId: res ? userId : undefined,
                resolutionNote: opts?.resolutionNote,
                assignedToUserId: opts?.assignedToUserId,
            },
        });
        const activities = [
            { organizationId, alertEventId: alert.id, type: 'CREATED', toStatus: 'OPEN' },
        ];
        if (status !== 'OPEN') {
            activities.push({ organizationId, alertEventId: alert.id, type: 'ACKNOWLEDGED', fromStatus: 'OPEN', toStatus: 'ACKNOWLEDGED', actorUserId: userId });
        }
        if (status === 'RESOLVED') {
            activities.push({ organizationId, alertEventId: alert.id, type: 'RESOLVED', fromStatus: 'ACKNOWLEDGED', toStatus: 'RESOLVED', actorUserId: userId, comment: opts?.resolutionNote });
        }
        await prisma.alertEventActivity.createMany({ data: activities });
        if (opts?.resolutionNote) {
            await prisma.alertEventComment.create({ data: { organizationId, alertEventId: alert.id, type: 'RESOLUTION_NOTE', body: opts.resolutionNote, authorUserId: userId } });
        }
        return alert;
    }
    // Helper: create evidence attachment on failed item; writes placeholder file so MockStorageService.readBytes can serve it
    async function createEvidenceAttachment(snapshotId, fileName) {
        const bucket = 'demo-seed';
        const objectKey = `evidence/${fileName}`;
        const fullPath = path.join(UPLOADS_BASE, bucket, objectKey);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, MINIMAL_JPEG);
        const file = await prisma.file.create({
            data: {
                organizationId,
                bucket,
                objectKey,
                fileName,
                mimeType: 'image/jpeg',
                sizeBytes: MINIMAL_JPEG.length,
                uploadedByUserId: userId,
            },
        });
        return prisma.attachment.create({
            data: {
                organizationId,
                fileId: file.id,
                checklistRunItemSnapshotId: snapshotId,
                attachmentType: 'EVIDENCE',
                purpose: 'evidence',
            },
        });
    }
    // --- Runs & Alerts (25–40 runs, 12–20+ alerts) ---
    // Run 1: OPEN alert (Opening – temp fail, with evidence)
    const { failItem: fail1 } = await createRunWithFailedItem(tpl(opening, 'demo-opening'), openSec0, openItem0, 'COMPLETED', twoHoursAgo, runOpts);
    const alert1 = await createAlert(fail1, 'OPEN', twoHoursAgo, { severity: 'CRITICAL' });
    await prisma.alertEventComment.create({
        data: { organizationId, alertEventId: alert1.id, type: 'COMMENT', body: 'Investigating the temperature reading.', authorUserId: userId },
    });
    await createEvidenceAttachment(fail1.id, 'walk-in-cooler-temp-fail-20240321.jpg');
    // Run 2: ACKNOWLEDGED alert (Opening – equipment)
    const { failItem: fail2 } = await createRunWithFailedItem(tpl(opening, 'demo-opening'), openSec0, openItem1, 'COMPLETED', yesterday, runOpts);
    await createAlert(fail2, 'ACKNOWLEDGED', yesterday, { severity: 'HIGH', acknowledgedAt: new Date(yesterday.getTime() + 15 * 60 * 1000) });
    // Run 3: RESOLVED alert (Opening – with resolution note)
    const { failItem: fail3 } = await createRunWithFailedItem(tpl(opening, 'demo-opening'), openSec0, openItem0, 'COMPLETED', yesterday, runOpts);
    await createAlert(fail3, 'RESOLVED', yesterday, { resolutionNote: 'Cooler thermostat recalibrated. Verified within spec.' });
    // Run 4: REOPENED (was RESOLVED, now OPEN)
    const { failItem: fail4 } = await createRunWithFailedItem(tpl(opening, 'demo-opening'), openSec0, openItem1, 'COMPLETED', yesterday, runOpts);
    const alert4 = await createAlert(fail4, 'OPEN', yesterday, { severity: 'HIGH' });
    await prisma.alertEventActivity.createMany({
        data: [
            { organizationId, alertEventId: alert4.id, type: 'ACKNOWLEDGED', fromStatus: 'OPEN', toStatus: 'ACKNOWLEDGED', actorUserId: userId },
            { organizationId, alertEventId: alert4.id, type: 'RESOLVED', fromStatus: 'ACKNOWLEDGED', toStatus: 'RESOLVED', actorUserId: userId },
            { organizationId, alertEventId: alert4.id, type: 'REOPENED', fromStatus: 'RESOLVED', toStatus: 'OPEN', actorUserId: userId },
        ],
    });
    await prisma.alertEventComment.create({
        data: { organizationId, alertEventId: alert4.id, type: 'REOPEN_NOTE', body: 'Issue recurred after initial fix. Reopening for follow-up.', authorUserId: userId },
    });
    // Run 5: SLA-breached OPEN (triggered long ago)
    const { failItem: fail5 } = await createRunWithFailedItem(tpl(opening, 'demo-opening'), openSec0, openItem0, 'COMPLETED', breachedAt, runOpts);
    await createAlert(fail5, 'OPEN', breachedAt, { severity: 'CRITICAL' });
    // Run 6: Assigned OPEN alert (Closing – assigned to QA)
    const { failItem: fail6 } = await createRunWithFailedItem(tpl(closing, 'demo-closing'), closeSec0, closeItem0, 'COMPLETED', twoHoursAgo, runOpts);
    await createAlert(fail6, 'OPEN', twoHoursAgo, { severity: 'HIGH', assignedToUserId: qaUserId });
    // Run 7: Assigned ACKNOWLEDGED (Cold Storage – assigned to Ops)
    const { failItem: fail7 } = await createRunWithFailedItem(tpl(coldStorage, 'demo-cold-storage'), coldSec0, coldItem0, 'COMPLETED', yesterday, runOpts);
    await createAlert(fail7, 'ACKNOWLEDGED', yesterday, { severity: 'CRITICAL', assignedToUserId: opsUserId });
    // Run 8: RESOLVED (Food Safety)
    const { failItem: fail8 } = await createRunWithFailedItem(tpl(foodSafety, 'demo-food-safety'), foodSec0, foodItem0, 'COMPLETED', yesterday, { ...runOpts, locationId: loc2.id });
    await createAlert(fail8, 'RESOLVED', yesterday, { resolutionNote: 'PPE restocked. Briefed staff on proper use.' });
    // Run 9: OPEN with evidence (Receiving – chilled temp fail)
    const { failItem: fail9 } = await createRunWithFailedItem(tpl(receiving, 'demo-receiving'), recSec0, recItem0, 'COMPLETED', twoHoursAgo, { ...runOpts, locationId: loc2.id });
    await createAlert(fail9, 'OPEN', twoHoursAgo, { severity: 'CRITICAL' });
    await createEvidenceAttachment(fail9.id, 'receiving-chilled-temp-20240321.jpg');
    // Run 10: OPEN (Equipment)
    const { failItem: fail10 } = await createRunWithFailedItem(tpl(equipment, 'demo-equipment'), eqSec0, eqItem0, 'COMPLETED', twoHoursAgo, { ...runOpts, locationId: loc2.id });
    await createAlert(fail10, 'OPEN', twoHoursAgo, { severity: 'HIGH', assignedToUserId: opsUserId });
    // Run 11–15: Overdue PENDING runs (for dashboard)
    await createRunWithFailedItem(tpl(opening, 'demo-opening'), openSec0, openItem0, 'PENDING', yesterday, runOpts);
    await createRunWithFailedItem(tpl(closing, 'demo-closing'), closeSec0, closeItem0, 'PENDING', yesterday, runOpts);
    await createRunWithFailedItem(tpl(coldStorage, 'demo-cold-storage'), coldSec0, coldItem0, 'PENDING', twoHoursAgo, runOpts);
    await createRunWithFailedItem(tpl(foodSafety, 'demo-food-safety'), foodSec0, foodItem0, 'PENDING', twoHoursAgo, { ...runOpts, locationId: loc2.id });
    await createRunWithFailedItem(tpl(receiving, 'demo-receiving'), recSec0, recItem0, 'PENDING', yesterday, { ...runOpts, locationId: loc2.id });
    // Run 16–20: IN_PROGRESS runs
    for (let i = 0; i < 5; i++) {
        await createRunWithFailedItem(tpl(opening, 'demo-opening'), openSec0, openItem0, 'IN_PROGRESS', now, runOpts);
    }
    // Run 21–30: COMPLETED clean runs (no fails)
    async function createCleanRun(t, key, dueAt) {
        const run = await prisma.checklistRun.create({
            data: {
                organizationId,
                checklistTemplateId: t.template.id,
                runSource: 'MANUAL',
                status: 'COMPLETED',
                dueAt,
                runNumber: runNumber++,
                templateVersion: 1,
                templateKeySnapshot: key,
                templateNameSnapshot: t.template.name,
                startedAt: dueAt,
                completedAt: new Date(dueAt.getTime() + 25 * 60 * 1000),
                performedByUserId: userId,
                locationId: loc1.id,
                brandId: brand.id,
            },
        });
        for (let si = 0; si < t.sections.length; si++) {
            const sec = t.sections[si];
            const sectionSnap = await prisma.checklistRunSectionSnapshot.create({
                data: { organizationId, checklistRunId: run.id, checklistTemplateSectionId: sec.id, titleSnapshot: sec.title, sortOrder: si },
            });
            for (let ii = 0; ii < sec.items.length; ii++) {
                const it = sec.items[ii];
                await prisma.checklistRunItemSnapshot.create({
                    data: {
                        organizationId,
                        checklistRunId: run.id,
                        checklistRunSectionSnapshotId: sectionSnap.id,
                        checklistTemplateItemId: it.id,
                        itemTypeSnapshot: it.itemType ?? 'BOOLEAN',
                        labelSnapshot: it.label,
                        isRequiredSnapshot: true,
                        requiresEvidenceOnFailSnapshot: false,
                        requiresCommentOnFailSnapshot: false,
                        severitySnapshot: 'LOW',
                        failureCreatesIncidentSnapshot: false,
                        configSnapshotJson: (it.configJson ?? undefined),
                        sortOrder: ii,
                        result: 'PASS',
                        respondedAt: run.completedAt,
                        respondedByUserId: userId,
                    },
                });
            }
        }
    }
    const templatesForClean = [opening, closing, coldStorage, foodSafety, receiving, equipment];
    const keysForClean = ['demo-opening', 'demo-closing', 'demo-cold-storage', 'demo-food-safety', 'demo-receiving', 'demo-equipment'];
    for (let i = 0; i < 10; i++) {
        const idx = i % templatesForClean.length;
        await createCleanRun(templatesForClean[idx], keysForClean[idx], new Date(threeDaysAgo.getTime() + i * 2 * 60 * 60 * 1000));
    }
    // Run 31–35: More alerts for variety (LOW/MEDIUM severity, mixed status)
    const { failItem: fail11 } = await createRunWithFailedItem(tpl(closing, 'demo-closing'), closing.sections[1], closing.sections[1].items[0], 'COMPLETED', threeDaysAgo, runOpts);
    await createAlert(fail11, 'RESOLVED', threeDaysAgo, { severity: 'CRITICAL', resolutionNote: 'Lock mechanism replaced.' });
    const { failItem: fail12 } = await createRunWithFailedItem(tpl(foodSafety, 'demo-food-safety'), foodSafety.sections[1], foodSafety.sections[1].items[0], 'COMPLETED', threeDaysAgo, { ...runOpts, locationId: loc2.id });
    await createAlert(fail12, 'ACKNOWLEDGED', threeDaysAgo, { severity: 'HIGH' });
    const { failItem: fail13 } = await createRunWithFailedItem(tpl(equipment, 'demo-equipment'), equipment.sections[1], equipment.sections[1].items[0], 'COMPLETED', threeDaysAgo, { ...runOpts, locationId: loc2.id });
    await createAlert(fail13, 'OPEN', threeDaysAgo, { severity: 'CRITICAL', assignedToUserId: qaUserId });
    await createEvidenceAttachment(fail13.id, 'refrigeration-unit-check-20240318.jpg');
    console.log('Demo data created: 6 templates, 35 runs, 14 alerts (OPEN/ACK/RESOLVED/reopened/assigned), 3 evidence attachments, org structure (1 brand, 3 locations, 6 zones), 11 users');
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
    const superAdminUser = await ensureUser(DEMO_USER_EMAIL, DEMO_USER_NAME, passwordHash);
    await setPlatformUserToSuperAdmin(superAdminUser.id, organization.id, superAdminRole.id);
    // Restaurant-relevant roles (org-scoped, assignable in org)
    const permByKey = Object.fromEntries(permissions.map((p) => [p.key, p]));
    for (const r of RESTAURANT_ROLES) {
        const role = await ensureOrgScopedRole(organization.id, r.key, r.name);
        const perms = r.permissionKeys
            .map((k) => permByKey[k])
            .filter((p) => p != null);
        await setRolePermissions(role.id, perms);
    }
    const orgAdminRole = await prisma.role.findFirst({
        where: { organizationId: organization.id, key: 'org_admin' },
    });
    if (!orgAdminRole)
        throw new Error('org_admin role not created');
    // Explicitly ensure checklist.run.generate is assigned (handles stale compiled seed)
    await ensureChecklistRunGenerateAssigned(superAdminRole.id, orgAdminRole.id);
    // org-admin@example.com → Org Admin (tenant-scoped testing)
    const orgAdminUser = await ensureUser(ORG_ADMIN_USER_EMAIL, ORG_ADMIN_USER_NAME, orgAdminPasswordHash);
    await setUserRoleInOrg(orgAdminUser.id, organization.id, orgAdminRole.id);
    // Demo users: 9 extra users with org roles (idempotent)
    await ensureDemoUsers(organization.id, orgAdminPasswordHash);
    // Optional: reset demo data before recreating (SEED_RESET_DEMO=true)
    if (SEED_RESET_DEMO) {
        console.log('SEED_RESET_DEMO=true: deleting demo data...');
        await deleteDemoData(organization.id);
    }
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
