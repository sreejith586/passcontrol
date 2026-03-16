# Next Steps

**Review and update after each implementation session.**

## Recommended (Priority Order)

1. **Add `ae.id DESC` tie-breaker** — In summary query `latest_alerts` CTE, make ORDER BY deterministic when `created_at` ties: `ORDER BY ae.source_id, ae.created_at DESC, ae.id DESC`. (Note: `summary-by-location` already uses this.)

2. **Handlers for published events** — Consider handlers for `checklist.run.completed`, `alert.acknowledged`, `alert.resolved` if downstream use cases emerge (e.g. notifications, analytics).

3. **Integration tests** — Add DB-backed tests for summary SQL and critical flows if not yet present.

## Optional / Future

- Async domain event publishing (outbox pattern)
- Additional reporting endpoints
- Webhook or notification integration

## Blocked / Deferred

- None
