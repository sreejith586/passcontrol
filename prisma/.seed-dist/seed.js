"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new client_1.PrismaClient();
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
const PERMISSIONS = [
    { key: 'temperature.reading.create', name: 'Create temperature readings' },
    { key: 'temperature.reading.view', name: 'View temperature readings' },
    { key: 'temperature.policy.create', name: 'Create temperature policies' },
    { key: 'temperature.policy.view', name: 'View temperature policies' },
    { key: 'temperature.policy.update', name: 'Update temperature policies' },
    { key: 'alert.view', name: 'View alert events' },
    { key: 'alert.acknowledge', name: 'Acknowledge alert events' },
    { key: 'alert.resolve', name: 'Resolve alert events' },
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
/** Tenant-scoped role: must have organizationId */
async function ensureOrgAdminRole(organizationId) {
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
async function main() {
    const passwordHash = await bcrypt.hash(DEMO_USER_PASSWORD, 10);
    const orgAdminPasswordHash = await bcrypt.hash(ORG_ADMIN_USER_PASSWORD, 10);
    const organization = await ensureOrganization();
    const permissions = await ensurePermissions();
    // Super Admin: platform/global role (organizationId = null), all permissions
    const superAdminRole = await ensureSuperAdminRole();
    await ensureRolePermissions(superAdminRole.id, permissions);
    // admin@example.com → Super Admin (platform-level testing)
    const superAdminUser = await ensureUser(DEMO_USER_EMAIL, DEMO_USER_NAME, passwordHash);
    await setUserRoleInOrg(superAdminUser.id, organization.id, superAdminRole.id);
    // Org Admin: tenant-scoped role, all permissions
    const orgAdminRole = await ensureOrgAdminRole(organization.id);
    await ensureRolePermissions(orgAdminRole.id, permissions);
    // org-admin@example.com → Org Admin (tenant-scoped testing)
    const orgAdminUser = await ensureUser(ORG_ADMIN_USER_EMAIL, ORG_ADMIN_USER_NAME, orgAdminPasswordHash);
    await setUserRoleInOrg(orgAdminUser.id, organization.id, orgAdminRole.id);
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
