# Development Playbook

## Before Implementation

1. **Read context** — `/docs/ai/01-system-architecture.md`, `/docs/ai/04-domain-model.md`, `/docs/ai/05-api-surface.md`
2. **Propose design** — Architecture reasoning, schema/query risks, minimal safe approach
3. **Get alignment** — Confirm approach before coding

## Implementation Flow

1. **Schema** — Add migrations only when needed; avoid breaking changes
2. **Repository** — Add queries; prefer raw SQL for complex aggregations
3. **Service** — Delegate to existing services; no logic duplication
4. **Controller** — Add routes; reuse permissions; keep response shapes
5. **Tests** — Unit tests for new behavior; mock dependencies

## Code Patterns

- **Repository:** Prisma for CRUD; `$queryRaw` for reporting/aggregation
- **Service:** Inject repositories and other services; throw `NotFoundException`, `BadRequestException`
- **Controller:** `@CurrentTenantContext()`, `RequirePermissions`, `ApiResponse.ok()`
- **DTOs:** class-validator decorators; `@IsOptional()` for optional fields

## Checklist for New Features

- [ ] Tenant scoping (`organizationId`) on all queries
- [ ] No API contract breakage
- [ ] Tests for success and key failure paths
- [ ] Implementation summary written
- [ ] Next steps updated in `/docs/ai/07-next-steps.md`

## Anti-Patterns

- Do not scatter alert/checklist logic across multiple services
- Do not add handlers for domain events without a clear use case
- Do not use `forwardRef` unless required for circular deps
