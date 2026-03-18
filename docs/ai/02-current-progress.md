# Current Progress

**Last updated:** 2025-03-17

## Implemented Features

### Checklist Engine

- [x] ChecklistTemplate with versioning, publish, archive
- [x] ChecklistTemplateSection, ChecklistTemplateItem
- [x] ChecklistSchedule with RRULE, timezone, brand/location/zone scope
- [x] ChecklistRun creation (manual + scheduled)
- [x] Snapshot-based execution (ChecklistRunSectionSnapshot, ChecklistRunItemSnapshot)
- [x] Run lifecycle: PENDING → IN_PROGRESS → COMPLETED
- [x] First item update transitions PENDING → IN_PROGRESS
- [x] Submit validation: required items answered, compliance (evidence/comment on FAIL)
- [x] Completed runs immutable

### Evidence & Compliance

- [x] Attachments link to `checklistRunItemSnapshotId`
- [x] Temperature readings link to `checklistRunItemSnapshotId`
- [x] `requiresEvidenceOnFail`, `requiresCommentOnFail` copied to snapshot
- [x] Severity (LOW, MEDIUM, HIGH, CRITICAL) copied to snapshot

### Alerts

- [x] AlertEvent with status OPEN, ACKNOWLEDGED, RESOLVED
- [x] Linkage: `sourceType = CHECKLIST_RUN_ITEM`, `sourceId = checklistRunItemSnapshotId`
- [x] Auto-create alert on NOT FAIL → FAIL transition (domain event)
- [x] Acknowledge, resolve endpoints
- [x] Convenience: `POST /v1/checklist-run-items/:id/acknowledge-alert`, `resolve-alert`

### Domain Events

- [x] `checklist.run-item.failed` → ChecklistRunItemFailedCreateAlertHandler
- [x] `checklist.run.completed` (published on submit)
- [x] `alert.acknowledged` (published on acknowledge)
- [x] `alert.resolved` (published on resolve)

### Supervisor APIs

- [x] `GET /v1/checklist-runs/today`, `overdue`, `failed`, `metrics`, `:id`
- [x] `POST /v1/checklist-runs/:id/submit`
- [x] `GET /v1/checklist-run-items/failed`, `:id`
- [x] `GET /v1/checklist-run-items/summary` (dashboard counts)
- [x] `GET /v1/checklist-run-items/summary-by-location` (failed items grouped by location)
- [x] `GET /v1/checklist-run-items/summary-by-template` (failed items grouped by template)
- [x] `GET /v1/checklist-run-items/trends/failures` (failed items trends over time)
- [x] `GET /v1/alert-events/trends` (alert lifecycle trends over time)
- [x] `GET /v1/alert-events/escalations` (SLA-based alert escalation reporting)
- [x] `GET /v1/alert-events/escalations/summary` (compact escalation summary for dashboards)
- [x] `GET /v1/alert-events/escalations/summary-by-location` (location-level escalation summary)
- [x] `GET /v1/alert-events/escalations/trends` (time-series escalation counts by bucket)
- [x] `GET /v1/alert-events/sla-compliance` (SLA compliance metrics: within-SLA/breached counts and rates)
- [x] `POST /v1/alert-events/bulk-acknowledge`, `POST /v1/alert-events/bulk-resolve` (bulk alert actions)
- [x] `GET /v1/alert-events/escalations/prioritized` (top N escalations by urgency)
- [x] Alert assignment: `POST /v1/alert-events/:id/assign`, `POST /v1/alert-events/:id/unassign`; assignment filters on list, escalations, prioritized
- [x] Alert activity timeline / audit trail: `AlertEventActivity` model with `CREATED`, `ACKNOWLEDGED`, `RESOLVED`, `ASSIGNED`, `UNASSIGNED`, `REASSIGNED`; `GET /v1/alert-events/:id/activities`; auto-logged on create, acknowledge, resolve, assign, unassign
- [x] Alert comments / resolution notes / reopen notes: `AlertEventComment` model (COMMENT, RESOLUTION_NOTE, REOPEN_NOTE); `GET /v1/alert-events/:id/comments`, `POST /v1/alert-events/:id/comments`; REOPEN_NOTE created by reopen flow only; separate domain from activity timeline
- [x] Alert reopen: `POST /v1/alert-events/:id/reopen`; RESOLVED → OPEN; optional body `{ note?: string }`; preserves assignment and SLA snapshot; REOPENED activity type; REOPEN_NOTE comment when note provided
- [x] Organization-level policies: `requireResolutionNoteOnResolve`, `requireReopenNoteOnReopen`; when enabled, resolve/reopen requires non-empty note (trimmed; whitespace-only rejected)
- [x] Organization settings API: `GET /v1/organization-settings/alert-workflow`, `PATCH /v1/organization-settings/alert-workflow`; both policy fields; permissions `alert.workflow-policy.view`, `alert.workflow-policy.manage`
- [x] Alert SLA foundation: AlertSlaPolicy model, snapshot SLA on AlertEvent, AlertSlaResolverService
- [x] Admin APIs for AlertSlaPolicy: GET/POST/PATCH /v1/alert-sla-policies (alert.sla-policy.view, alert.sla-policy.manage)
- [x] GET /v1/alert-sla-policies/preview (SLA preview for given severity/scope, uses same resolver as alert creation)
- [x] `POST /v1/checklist-run-items/:id/acknowledge-alert`, `resolve-alert`

### Other

- [x] Temperature policies, readings, breach handling
- [x] Files, attachments
- [x] Auth (JWT), RBAC

## Not Yet Implemented

- Handlers for `checklist.run.completed`, `alert.acknowledged`, `alert.resolved` (events published, no consumers)
- Async/outbox domain event publishing
- Additional reporting or analytics endpoints
