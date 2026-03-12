# Compile-readiness alignment pass

## 1. Files updated

| File | Change |
|------|--------|
| `src/attachments/controllers/attachments.controller.ts` | Import `TenantContext` from access decorator; type all `@CurrentTenantContext()` params as `TenantContext`. |
| `src/files/controllers/files.controller.ts` | Same: `TenantContext` import and param types. |
| `src/alert-events/controllers/alert-events.controller.ts` | Same: `TenantContext` import and param types. |
| `src/temperature/controllers/temperature-policies.controller.ts` | Same: `TenantContext` import and param types. |
| `src/temperature/controllers/temperature-readings.controller.ts` | Same: `TenantContext` import and param types. |

No other files were changed. Unresolved imports were not found; all existing modules already pointed at the correct shared foundations.

---

## 2. Verification summary

- **Imports**: All domain modules import infra (Prisma, config, responses), audit (`AuditLogsService`), auth (`AuthGuard`), and access (`RbacGuard`, `RequirePermissions`, `CurrentTenantContext`) from the correct paths.
- **AppModule**: Imports Infra, Audit, Auth, Access, then Temperature, AlertEvents, Files, Attachments. Order and wiring are correct.
- **Guards/decorators**: `AuthGuard` (alias for `JwtAuthGuard`) and `RbacGuard` are imported from `../../auth/guards/auth.guard` and `../../access/rbac/rbac.guard`. `RequirePermissions` and `CurrentTenantContext` are from `../../access/rbac/permissions.decorator` and `../../access/decorators/current-tenant.decorator`.
- **ApiResponse / PrismaService / AuditLogsService**: Used consistently; all domain controllers use `ApiResponse.ok()` or `.created()`; services that need DB or audit inject `PrismaService` and/or `AuditLogsService`; modules that need them import `InfraModule` and/or `AuditModule`.
- **AuthGuard / JwtAuthGuard**: Auth controller uses `JwtAuthGuard`; all other controllers use `AuthGuard` from the same file (alias). Naming is aligned.
- **RbacGuard and RequirePermissions**: Guard reads `REQUIRE_PERMISSIONS` metadata; decorator sets it with `SetMetadata(REQUIRE_PERMISSIONS, permissions)`. Routes without the decorator are allowed; routes with it are checked. Aligned.
- **CurrentTenantContext**: Returns `TenantContext` (`{ organizationId: string; userId?: string }`). All controller params using it are now typed as `TenantContext`.
- **ModuleGuard / EntitlementGuard / UsageLimitGuard**: No metadata → allow. With metadata and no user → `ForbiddenException`. Stub entitlement returns `true`, so in MVP they allow when metadata is set. Fail safely.

---

## 3. Unresolved blockers (before the project can compile)

1. **Dependencies**: Run `npm install` so `node_modules` exists. The repo has a `package.json` but install may not have been run.
2. **Prisma client**: Run `npx prisma generate` after `npm install` so `@prisma/client` is generated from `prisma/schema.prisma`.
3. **Environment**: Ensure `.env` (or equivalent) defines at least `DATABASE_URL` and optionally `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`.
4. **Database**: Run `npx prisma migrate dev` (or deploy migrations) so the database schema exists; otherwise runtime will fail when Prisma runs queries.

No code or import blockers remain; only tooling and environment steps above.

---

## 4. Recommended next step after compile alignment

1. Run `npm install`, then `npx prisma generate`.
2. Run `npm run build` and fix any TypeScript or Nest build errors (e.g. strict null checks or missing types).
3. Add a `.env` with `DATABASE_URL` and JWT vars, then run `npx prisma migrate dev` to create the DB schema.
4. Run `npm run start:dev` and smoke-test auth (login, refresh, me) and one domain route (e.g. temperature or alert-events) to confirm guards and tenant context.
5. (Optional) Seed a user, organization, role, and permissions so RBAC and `RbacGuard` can be tested end-to-end.
