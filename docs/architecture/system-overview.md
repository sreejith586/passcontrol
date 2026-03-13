# System Overview

> Consolidated from existing design documents. No new architecture.

---

## Stack

- **Backend**: NestJS, Prisma, PostgreSQL
- **Auth**: JWT (access + refresh), Passport, Argon2
- **Access**: RBAC (Role, Permission, UserRoleAssignment), optional ModuleGuard and EntitlementGuard

---

## Module Layering

1. **Infra** – Prisma, config, logging, request context, API response helpers, pagination
2. **Audit** – AuditLogsService (recordWrite, recordAuthEvent, recordAccessDenied)
3. **Auth** – AuthController, AuthService, JwtAuthGuard, JwtStrategy, login/refresh/me
4. **Access** – RbacGuard, RequirePermissions, CurrentTenantContext, EntitlementService (stub), ModuleGuard, EntitlementGuard, UsageLimitGuard
5. **Domain** – Temperature, AlertEvents, Files, Attachments (Incidents, Tasks, Checklist referenced by schema; modules TBD)

---

## Domain Module Structure (implemented)

| Module            | Controllers                                      | Key Services                                 | Dependencies                         |
|-------------------|--------------------------------------------------|----------------------------------------------|--------------------------------------|
| Temperature       | temperature-policies, temperature-readings       | policies, readings, policy-scope, policy-resolver, breach-detection | Infra, Access, Audit, AlertEvents    |
| AlertEvents       | alert-events                                     | alert-events                                 | Infra, Access, Audit                 |
| Files             | files                                            | files, storage (mock)                         | Infra, Access, Audit                 |
| Attachments       | attachments                                      | attachments, attachment-ownership             | Infra, Access, Audit                 |

---

## Tenant Model

- All domain data is **organization-scoped**.
- Brand → Location → Zone → Asset hierarchy for scoping.
- RBAC can restrict by brand/location per UserRoleAssignment (brandId, locationId).

---

## API Conventions

- Versioned routes: `/v1/...`
- AuthGuard + RbacGuard on protected endpoints.
- ApiResponse.ok(data) / ApiResponse.created(data) / ApiResponse.fail(error).
- CurrentTenantContext decorator injects { organizationId, userId? } from JWT.
