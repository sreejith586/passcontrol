# Decisions Log

## Format

Each entry: **Date | Decision | Rationale**

---

## Entries

### Domain event system (in-process)

- **Decision:** Use synchronous, in-process `InMemoryDomainEventPublisher` with fail-fast semantics.
- **Rationale:** Keeps complexity low; events published only after successful mutation; no outbox yet.

### Alert creation via domain event

- **Decision:** Publish `checklist.run-item.failed` on NOT FAIL → FAIL transition; handler creates AlertEvent.
- **Rationale:** Centralizes alert creation; removes inline logic from ChecklistRunsService.

### Convenience alert endpoints

- **Decision:** Add `acknowledge-alert` and `resolve-alert` on checklist-run-items; delegate to AlertEventsService.
- **Rationale:** Supervisor UX; no logic duplication; reuse existing permissions.

### Summary endpoint SQL

- **Decision:** Use raw SQL with CTEs (`filtered_failed_items`, `latest_alerts`); `DISTINCT ON` for latest alert per item.
- **Rationale:** Single query; consistent with failed list filters; efficient aggregation.

### forwardRef for AlertEventsModule ↔ DomainEventsModule

- **Decision:** Use `forwardRef` to resolve circular import.
- **Rationale:** DomainEventsModule needs AlertEventsRepository for handler; AlertEventsModule needs DomainEventsModule for publisher.

### Alert escalation reporting (raw SQL)

- **Decision:** Use raw SQL with CTEs for escalation list and summary endpoints; compute breach flags (`ack_breached`, `res_breached`) in SQL using application-provided `now`.
- **Rationale:** Deterministic breach logic; single query for aggregation; consistent with existing summary patterns.

### Alert SLA policy admin module

- **Decision:** Dedicated `AlertSlaPoliciesModule` with CRUD, conflict detection, and preview; reuse `AlertSlaResolverService` from AlertEventsModule for preview.
- **Rationale:** Separation of admin concerns; preview uses same resolver as alert creation; service-layer conflict checking for duplicate active policies.

### Escalation trends endpoint

- **Decision:** Add `GET /v1/alert-events/escalations/trends` with raw SQL; bucket by `DATE_TRUNC(interval, created_at)::date`; from/to apply to `created_at`; breach flags computed at application-provided `now`.
- **Rationale:** Consistent with existing escalation reporting (CTEs, breach logic in SQL); shows escalation pressure over time for dashboards; no fill of missing buckets.

### SLA compliance summary endpoint

- **Decision:** Add `GET /v1/alert-events/sla-compliance` with raw SQL; from/to apply to `created_at`; all statuses by default; compliance = withinSla / (withinSla + breached); evaluated excludes alerts not yet past deadline.
- **Rationale:** Management/reporting endpoint distinct from escalation list; KPI-style metrics; unacknowledged/unresolved alerts within SLA window excluded from evaluated count.

### Bulk alert actions

- **Decision:** Add `bulk-acknowledge` and `bulk-resolve` endpoints; delegate to existing single-alert methods; partial success model; max 100 IDs; deduplicate before processing.
- **Rationale:** No logic duplication; audit, domain events, validations remain centralized; operational efficiency for supervisors.

### Prioritized escalation retrieval

- **Decision:** Add `GET /v1/alert-events/escalations/prioritized` with raw SQL; rank groups RESOLVE_BREACHED > ACKNOWLEDGE_BREACHED > ACTIVE_NOT_BREACHED; within group: severity, overdue minutes, createdAt; include acknowledgeOverdueMinutes and resolveOverdueMinutes in response.
- **Rationale:** Lightweight top-N for dashboards; no pagination; scoreHint reflects overdue duration for UI.

### Alert assignment

- **Decision:** Add `assignedToUserId`, `assignedAt`, `assignedByUserId` to AlertEvent; assign/unassign endpoints; allow for OPEN/ACKNOWLEDGED only; reject for RESOLVED; reassignment allowed; filter precedence: unassignedOnly > assignedToMe > assignedUserId.
- **Rationale:** Lightweight user ID attribution; no full User relation for v1; audit assignment mutations.

### Alert activity timeline

- **Decision:** Add `AlertEventActivity` model with types CREATED, ACKNOWLEDGED, RESOLVED, ASSIGNED, UNASSIGNED, REASSIGNED; log after successful mutation; create+CREATED in same Prisma transaction; assignment type derived from from/to assignee (null→user=ASSIGNED, user→null=UNASSIGNED, user→user=REASSIGNED).
- **Rationale:** Audit trail for alert lifecycle; no pagination or user enrichment in v1; Prisma for CRUD (no raw SQL).

### Alert mutation + activity atomicity

- **Decision:** All alert mutation flows (acknowledge, resolve, assign, unassign) execute mutation and activity insert inside a single `prisma.$transaction`; repository methods accept optional `tx` for transaction client; domain events and audit logged after transaction commits.
- **Rationale:** Eliminates consistency gap where alert mutates successfully but activity logging fails; aligns with createFromPayload pattern.

### Alert comments as separate domain

- **Decision:** `AlertEventComment` model (COMMENT, RESOLUTION_NOTE, REOPEN_NOTE) separate from `AlertEventActivity`; no merged timeline or reuse of activity for comments; body max 4000 chars; allowed on all statuses; no edit/delete in v1. COMMENT and RESOLUTION_NOTE user-added; REOPEN_NOTE system-created on reopen with note.
- **Rationale:** Keeps activity timeline and comments as distinct domains; avoids overloading activity with user-authored content.

### Alert reopen

- **Decision:** Add `POST /v1/alert-events/:id/reopen`; allowed only when status is RESOLVED; optional body `{ note?: string }`; transition to OPEN; clear acknowledgedAt/resolvedAt/resolutionNote; preserve assignment and SLA snapshot; log REOPENED activity; atomic with `$transaction`; use alert.resolve permission. When `requireReopenNoteOnReopen` enabled, note required; note stored as REOPEN_NOTE comment when provided.
- **Rationale:** Enables reopening incorrectly resolved alerts; no SLA resnapshotting or assignment clearing in v1; policy mirrors requireResolutionNoteOnResolve.

### Organization-level require-resolution-note policy

- **Decision:** Add `Organization.requireResolutionNoteOnResolve` (boolean, default false); when true, resolve (single and bulk) requires a non-empty resolution note; trim before validation; reject blank/whitespace-only; BadRequestException with clear message.
- **Rationale:** Small V1 policy feature; no generic rules engine; org-scoped; enforce only on resolve, not reopen.

### Organization settings API for alert workflow

- **Decision:** Add `GET /v1/organization-settings/alert-workflow` and `PATCH /v1/organization-settings/alert-workflow`; permissions `alert.workflow-policy.view`, `alert.workflow-policy.manage`; PATCH body `{ requireResolutionNoteOnResolve?: boolean, requireReopenNoteOnReopen?: boolean }`; tenant-scoped via ctx.organizationId.
- **Rationale:** Minimal V1 management surface; no generic settings engine; follows alert.sla-policy.* permission pattern.

### Organization-level require-reopen-note policy

- **Decision:** Add `Organization.requireReopenNoteOnReopen` (boolean, default false); when true, reopen requires a non-empty note; trim before validation; reject blank/whitespace-only; BadRequestException with clear message. Store reopen note as `AlertEventComment` with `type = REOPEN_NOTE` (no reopenNote column on AlertEvent). Reopen transaction is atomic: update alert, log REOPENED activity, create REOPEN_NOTE comment when note provided.
- **Rationale:** Mirrors requireResolutionNoteOnResolve pattern; reuses comments domain; no schema change to AlertEvent; atomic transaction preserves consistency.

### Users list for assignment

- **Decision:** Add `GET /v1/users` (org-scoped, paginated); permission `alert.assign`; returns id, name, email. Users = those with `UserRoleAssignment` for the org. Assign endpoint validates target user belongs to org via `belongsToOrganization` before updating.
- **Rationale:** Enables assign/reassign UI; no user search in v1; tenant safety enforced at assign time.

### Raw SQL UUID parameter casts

- **Decision:** When using Prisma `$queryRaw` with UUID column comparisons, cast parameters explicitly: `(${param})::uuid`. Prisma passes params as text; PostgreSQL rejects `uuid = text` without cast.
- **Rationale:** Fixes 500s on escalation endpoints (listEscalations, getEscalationsSummary, listPrioritizedEscalations); applies to all raw SQL comparing UUID columns.

### Password setup token for invited users

- **Decision:** Add `PasswordSetupToken` model (userId, tokenHash, expiresAt, usedAt); store SHA-256 of token, not bcrypt; 7-day expiry; single-use. Invite returns setupToken when user has no passwordHash. Public endpoints: `POST /auth/validate-setup-token`, `POST /auth/set-password`. No auto-login after set-password.
- **Rationale:** Token-based flow preferred over admin-set temp password; no email delivery yet (admin copies link); production-realistic; invalidate prior unused tokens on re-invite.

### Alert list date-only "to" filter semantics

- **Decision:** For GET /v1/alert-events list, date-only `to` (YYYY-MM-DD, length ≤10) means through end of that day UTC: convert to next day midnight UTC and use `lt` (exclusive). Full ISO datetime `to` preserves precise `lte`. `from` unchanged (gte start of day UTC).
- **Rationale:** `new Date("YYYY-MM-DD")` parses to UTC midnight; using `lte` on that excluded almost the entire day. Users expect "to 2025-03-15" to include all alerts on March 15 UTC.

### Quick-setup onboarding (Phase 13B.1)

- **Decision:** Single POST /onboarding/quick-setup endpoint creates template (quick-setup-starter), schedule, and run; returns runId. Permission: checklist.template.create. Idempotent for template/schedule: reuses if exists; on duplicate run for same day, returns existing runId.
- **Rationale:** Minimal first-value flow without full template/schedule UI; admins can reach first run in one click; no new permission (reuses template.create); backend orchestrates existing services.
