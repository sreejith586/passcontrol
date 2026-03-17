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
