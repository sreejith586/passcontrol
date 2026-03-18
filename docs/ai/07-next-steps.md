# Next Steps

**Review and update after each implementation session.**

---

## 1. Advanced Operational Intelligence (HIGH PRIORITY)

- ~~**Escalation trends (time-based)**~~ — *Done.* `GET /v1/alert-events/escalations/trends` returns breach counts and active-alert counts over time buckets (day/week/month).
- ~~**SLA compliance metrics**~~ — *Done.* `GET /v1/alert-events/sla-compliance` returns within-SLA/breached counts and compliance rates for acknowledgment and resolution.

---

## 2. Supervisor / Action Layer (HIGH PRIORITY)

- ~~**Bulk acknowledge alerts**~~ — *Done.* `POST /v1/alert-events/bulk-acknowledge` with `{ alertEventIds }`.
- ~~**Bulk resolve alerts**~~ — *Done.* `POST /v1/alert-events/bulk-resolve` with `{ alertEventIds, resolutionNote? }`.
- ~~**Prioritized escalation retrieval (top N)**~~ — *Done.* `GET /v1/alert-events/escalations/prioritized` returns top N by urgency (resolve breached, acknowledge breached, active).
- ~~**Alert assignment / ownership**~~ — *Done.* `POST /v1/alert-events/:id/assign`, `POST /v1/alert-events/:id/unassign`; assignment filters (assignedUserId, assignedToMe, unassignedOnly) on list, escalations, prioritized.
- ~~**Alert activity timeline / audit trail**~~ — *Done.* `AlertEventActivity` model; `GET /v1/alert-events/:id/activities`; auto-logged on create, acknowledge, resolve, assign, unassign.
- ~~**Alert reopen**~~ — *Done.* `POST /v1/alert-events/:id/reopen`; RESOLVED → OPEN; optional note; policy `requireReopenNoteOnReopen`; note stored as REOPEN_NOTE comment; preserves assignment and SLA snapshot.

---

## 3. Platform Hardening (MEDIUM PRIORITY)

- **Pagination standardization** — Align pagination params (page, limit, max limit) and response shape across list endpoints. Document in API surface.
- **Query/index optimization for escalation queries** — Add or tune indexes for `alert_events` escalation filters (organization_id, status, created_at, location_id). Profile and optimize raw SQL.
- **Expansion of domain event handlers** — Handlers for `checklist.run.completed`, `alert.acknowledged`, `alert.resolved`. Extend to temperature, IoT, or other alert sources as needed.
