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

- **Decision:** `AlertEventComment` model (COMMENT, RESOLUTION_NOTE) separate from `AlertEventActivity`; no merged timeline or reuse of activity for comments; body max 4000 chars; allowed on all statuses; no edit/delete in v1.
- **Rationale:** Keeps activity timeline and comments as distinct domains; avoids overloading activity with user-authored content.

### Alert reopen

- **Decision:** Add `POST /v1/alert-events/:id/reopen`; allowed only when status is RESOLVED; transition to OPEN; clear acknowledgedAt/resolvedAt/resolutionNote; preserve assignment and SLA snapshot; log REOPENED activity; atomic with `$transaction`; use alert.resolve permission.
- **Rationale:** Enables reopening incorrectly resolved alerts; no SLA resnapshotting or assignment clearing in v1.

### Organization-level require-resolution-note policy

- **Decision:** Add `Organization.requireResolutionNoteOnResolve` (boolean, default false); when true, resolve (single and bulk) requires a non-empty resolution note; trim before validation; reject blank/whitespace-only; BadRequestException with clear message.
- **Rationale:** Small V1 policy feature; no generic rules engine; org-scoped; enforce only on resolve, not reopen.

### Organization settings API for alert workflow

- **Decision:** Add `GET /v1/organization-settings/alert-workflow` and `PATCH /v1/organization-settings/alert-workflow`; permissions `alert.workflow-policy.view`, `alert.workflow-policy.manage`; PATCH body `{ requireResolutionNoteOnResolve: boolean }`; tenant-scoped via ctx.organizationId.
- **Rationale:** Minimal V1 management surface; no generic settings engine; follows alert.sla-policy.* permission pattern.
