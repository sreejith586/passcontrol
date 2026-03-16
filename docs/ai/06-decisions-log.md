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
