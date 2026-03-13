"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new client_1.PrismaClient();
const DEMO_ORGANIZATION_NAME = 'Demo Org';
const DEMO_USER_NAME = 'Demo Admin';
const DEMO_USER_EMAIL = 'admin@example.com';
const DEMO_USER_PASSWORD = 'Password123!';
const DEMO_ROLE_NAME = 'Super Admin';
const DEMO_ROLE_KEY = 'super_admin';
const DEMO_ROLE_SCOPE = 'ORGANIZATION';
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
async function ensureUser(passwordHash) {
    return prisma.user.upsert({
        where: { email: DEMO_USER_EMAIL },
        update: {
            name: DEMO_USER_NAME,
            passwordHash,
            isActive: true,
            deletedAt: null,
        },
        create: {
            email: DEMO_USER_EMAIL,
            name: DEMO_USER_NAME,
            passwordHash,
            isActive: true,
        },
    });
}
async function ensureRole(organizationId) {
    const role = await prisma.role.findFirst({
        where: {
            organizationId,
            key: DEMO_ROLE_KEY,
        },
    });
    if (role) {
        return prisma.role.update({
            where: { id: role.id },
            data: {
                name: DEMO_ROLE_NAME,
                scope: DEMO_ROLE_SCOPE,
                isSystem: false,
            },
        });
    }
    return prisma.role.create({
        data: {
            organizationId,
            name: DEMO_ROLE_NAME,
            key: DEMO_ROLE_KEY,
            scope: DEMO_ROLE_SCOPE,
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
async function main() {
    const passwordHash = await bcrypt.hash(DEMO_USER_PASSWORD, 10);
    const organization = await ensureOrganization();
    const user = await ensureUser(passwordHash);
    const role = await ensureRole(organization.id);
    const permissions = await ensurePermissions();
    await ensureRolePermissions(role.id, permissions);
    await ensureUserRoleAssignment(user.id, organization.id, role.id);
    console.log(`Seed complete for ${DEMO_USER_EMAIL}`);
    console.log(`Organization: ${organization.name}`);
    console.log(`Role: ${role.name}`);
    console.log(`Permissions linked: ${permissions.length}`);
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
