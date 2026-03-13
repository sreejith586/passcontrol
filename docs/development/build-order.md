# Build Order

> Consolidated from compile-readiness alignment and shared foundation implementation.

---

## Phase 1: Infra

1. Prisma schema, PrismaService, PrismaModule
2. Config (configuration.ts, ConfigModule)
3. Logging (LoggerService, LoggerModule)
4. Request context (RequestContextService, middleware) – optional for MVP
5. API response helpers (ApiResponse.ok, .created, .fail)
6. Pagination (PaginationQueryDto)

---

## Phase 2: Audit

1. AuditModule
2. AuditLogsService (recordWrite, recordAuthEvent, recordAccessDenied)
3. No separate repository; uses PrismaService

---

## Phase 3: Auth

1. AuthModule, AuthController, AuthService
2. JwtStrategy, JwtAuthGuard (AuthGuard alias)
3. DTOs: LoginDto, RefreshDto
4. Login, refresh, me endpoints

---

## Phase 4: Access

1. AccessModule
2. RbacGuard, RbacService, RequirePermissions decorator
3. CurrentTenantContext decorator
4. EntitlementService (stub)
5. ModuleGuard, EntitlementGuard, UsageLimitGuard

---

## Phase 5: Domain Modules

1. Temperature (policies, readings) – imports AlertEventsModule
2. AlertEvents – no dependency on Temperature
3. Files – init-upload, register
4. Attachments – create, list, get, delete

---

## Phase 6: App Bootstrap

1. AppModule – Infra → Audit → Auth → Access → domain modules
2. main.ts – NestFactory, ValidationPipe

---

## Post-Build Steps

1. `npm install`
2. `npx prisma generate`
3. `npx prisma migrate dev` (or deploy migrations)
4. Add .env (DATABASE_URL, JWT vars)
5. Seed user, org, role, permissions for RBAC testing
