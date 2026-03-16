# System Architecture

## Stack

- **Runtime:** Node.js, NestJS 10, TypeScript
- **Data:** PostgreSQL, Prisma 5
- **Time:** Luxon (timezone-aware)
- **Recurrence:** rrule
- **Testing:** Jest

## Multi-Tenancy

- All data scoped by `organizationId`.
- RBAC via `UserRoleAssignment`, `Role`, `Permission`.
- `TenantContext` from JWT: `{ organizationId, userId }`.

## Module Layout

```
src/
├── auth/           # JWT auth, login
├── access/         # RBAC guards, TenantContext
├── audit/          # AuditLog write recording
├── infra/          # Prisma, config
├── files/          # File registration (bucket, objectKey)
├── attachments/    # File linkage to incidents, tasks, run items
├── temperature/    # Policies, readings, breach handling
├── alert-events/   # Alert lifecycle (OPEN → ACKNOWLEDGED → RESOLVED)
├── checklists/
│   ├── templates/  # ChecklistTemplate, sections, items
│   ├── schedules/  # RRULE scheduling, cron generation
│   └── runs/       # ChecklistRun, snapshots, execution
└── common/
    └── domain-events/  # In-process event publisher
```

## API Versioning

- REST under `/v1` (NestJS URI versioning).
- Swagger at `/docs`.

## Domain Events

- **Publisher:** `InMemoryDomainEventPublisher` (sync, sequential, fail-fast).
- **Events:** `checklist.run-item.failed`, `checklist.run.completed`, `alert.acknowledged`, `alert.resolved`.
- **Handlers:** Registered in `DomainEventsModule.onModuleInit`.
- Publish only after successful DB mutation.

## Scheduling

- Cron runs every minute (`ChecklistScheduleCronService`).
- RRULE + Luxon timezone support.
- Resilience fields: `lastGenerationAttemptAt`, `lastGenerationStatus`, `nextGenerationAttemptAt`.
