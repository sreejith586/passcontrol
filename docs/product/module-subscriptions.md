# Module & Subscription Model

> Consolidated from permission-matrix-incidents-tasks and entitlement design.

---

## Module Checks

- **ModuleGuard** – checks if a module key is active for the organization
- **Example module**: `CORE_OPS` – must be active for incidents/tasks access
- Access denied if module is inactive (in addition to RBAC)

---

## Entitlement Checks

- **EntitlementGuard** – checks if a feature key is enabled for the organization
- **Example feature keys**: `INCIDENTS`, `TASKS`
- Access denied if entitlement is disabled

---

## Usage Limits (planned)

- **UsageLimitGuard** – checks usage metric vs limit (e.g. storage, API calls)
- **EntitlementService.checkUsageLimit** – stub returns `true` in MVP
- Extension point for subscription-backed limits

---

## Current Implementation (MVP)

- **EntitlementService** – stub: `isModuleEnabled`, `isFeatureEnabled`, `checkUsageLimit` all return `true`
- No schema-backed subscription/entitlement tables yet
- Guards fail safely: no metadata → allow; with metadata and no user → ForbiddenException
- Schema-backed entitlements can be added later without changing guard API

---

## Role → Module Mapping (from permission matrix)

| Role               | Scope        | Incidents | Tasks |
|--------------------|--------------|-----------|-------|
| Org Admin          | Full org     | ✓         | ✓     |
| Location Manager   | Assigned loc | ✓         | ✓     |
| Kitchen Supervisor | Assigned loc | ✓         | ✓     |
| Kitchen Staff      | Own scope    | create/view/comment | view/complete (assigned) |

Module and entitlement checks apply on top of RBAC; both must pass.
