# Current Progress

**Last updated:** Session checkpoint

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
