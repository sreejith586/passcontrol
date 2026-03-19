# Current Progress

**Last updated:** 2025-03-20

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
- [x] Users list for assignment: `GET /v1/users` (org-scoped, paginated; id, name, email, isActive, roles); permissions `user.view` or `alert.assign`; validates target user belongs to org on assign
- [x] Alert activity timeline / audit trail: `AlertEventActivity` model with `CREATED`, `ACKNOWLEDGED`, `RESOLVED`, `ASSIGNED`, `UNASSIGNED`, `REASSIGNED`; `GET /v1/alert-events/:id/activities`; auto-logged on create, acknowledge, resolve, assign, unassign
- [x] Alert comments / resolution notes / reopen notes: `AlertEventComment` model (COMMENT, RESOLUTION_NOTE, REOPEN_NOTE); `GET /v1/alert-events/:id/comments`, `POST /v1/alert-events/:id/comments`; REOPEN_NOTE created by reopen flow only; separate domain from activity timeline
- [x] Alert reopen: `POST /v1/alert-events/:id/reopen`; RESOLVED → OPEN; optional body `{ note?: string }`; preserves assignment and SLA snapshot; REOPENED activity type; REOPEN_NOTE comment when note provided
- [x] Organization-level policies: `requireResolutionNoteOnResolve`, `requireReopenNoteOnReopen`; when enabled, resolve/reopen requires non-empty note (trimmed; whitespace-only rejected)
- [x] Organization settings API: `GET /v1/organization-settings/alert-workflow`, `PATCH /v1/organization-settings/alert-workflow`; both policy fields; permissions `alert.workflow-policy.view`, `alert.workflow-policy.manage`
- [x] Alert SLA foundation: AlertSlaPolicy model, snapshot SLA on AlertEvent, AlertSlaResolverService
- [x] Admin APIs for AlertSlaPolicy: GET/POST/PATCH /v1/alert-sla-policies (alert.sla-policy.view, alert.sla-policy.manage)
- [x] GET /v1/alert-sla-policies/preview (SLA preview for given severity/scope, uses same resolver as alert creation)
- [x] `POST /v1/checklist-run-items/:id/acknowledge-alert`, `resolve-alert`

### User Management (Admin)

- [x] `POST /v1/users/invite` — invite by email; creates user if new (passwordHash=null); assigns role; returns `setupToken?` when user has no password
- [x] `POST /v1/users/:id/roles`, `DELETE /v1/users/:id/roles/:roleId` — add/remove roles (user.manage)
- [x] `PATCH /v1/users/:id/status` — activate/deactivate user (user.manage); global account status, not org-specific
- [x] Password setup flow: `PasswordSetupToken` model (SHA-256 hash, 7-day expiry, single-use); `POST /v1/auth/validate-setup-token`, `POST /v1/auth/set-password`; invite returns setupToken when passwordHash is null
- [x] Frontend: Users page with status column (Active/Inactive), actions (Edit roles, Activate/Deactivate); EditRolesModal (delta add/remove); ConfirmActionModal for status changes

### Onboarding Flow

- [x] Frontend: `/set-password` public route; SetPasswordPage validates token on load; password form or ErrorState; redirect to login with success banner
- [x] AddUserModal: when setupToken returned, shows copyable setup link (origin + /set-password?token=...)
- [x] PassControl branding: header, sidebar, login page, set-password page; document title; index.html default title

### Frontend

- [x] Auth (login/logout), session via /me, access-token only
- [x] Phase 7 — core execution UI: Checklist Runs list (Today/Overdue/Failed tabs), Run detail/execution page, item inputs (BOOLEAN, TEXT, TEMPERATURE, CHECKBOX), submit flow with validation error handling, success/error feedback, navigation. Production hardening: Failed tab, mutation safety, redundant PATCH prevention, race-condition handling, unsupported item types.
- [x] Evidence visibility: Read-only evidence panel (GET /checklist-run-items/:id for attachments), clickable "Evidence attached (N)" badge, optional delete (DELETE /attachments/:id) when attachment.delete; permission-gated; no upload UI (backend has no multipart receive).
- [x] Alert list, detail, acknowledge, resolve, reopen, unassign
- [x] Alert assignment: AssignModal, users list (GET /v1/users), assign/reassign; assignee display (name or "Unknown user"); query invalidation for all list variants
- [x] Phase 3 UI polish: StatusBadge/SeverityBadge/AssigneeBadge with user-friendly labels; ErrorState/EmptyState/Skeleton; Alert Detail refinement (header, SLA breach emphasis, timeline alignment, comments); FilterBar; source type labels (CHECKLIST_RUN_ITEM → "Checklist item"); collapsible sidebar (localStorage); table consistency
- [x] Phase 8A — Alert List Power Features: bulk acknowledge, bulk resolve, richer filters (severity, sourceType, from, to, assignedUserId); row selection (page-local, select-all); collapsible advanced filters; permission-gated bulk actions; partial-success toast feedback
- [x] Phase 8B — Escalations parity: richer filters (severity, assignedToMe, unassignedOnly, assignedUserId); URL-synced filter state; assignment filter precedence (unassignedOnly > assignedToMe > assignedUserId); primary vs advanced filter grouping; row click → /alerts/:id preserved

### Backend (recent fixes)

- [x] Escalation raw SQL: explicit `::uuid` casts for UUID parameters in listEscalations, getEscalationsSummary, listPrioritizedEscalations (fixes PostgreSQL `uuid = text` 500s)
- [x] Alert list date filter: date-only `to` (YYYY-MM-DD) now means through end of day UTC (use `lt` next day); full ISO datetime preserves precise `lte`; `from` unchanged (start of day UTC)

### Other

- [x] Temperature policies, readings, breach handling
- [x] Files, attachments
- [x] Auth (JWT), RBAC

## Phase 7 Remaining Gaps

- Attachment upload UI — backend has no multipart receive; init-upload returns mock metadata only; evidence visibility and delete implemented
- Template/schedule authoring UI — not in scope for Phase 7

## Not Yet Implemented

- Handlers for `checklist.run.completed`, `alert.acknowledged`, `alert.resolved` (events published, no consumers)
- Async/outbox domain event publishing
- Additional reporting or analytics endpoints
- Email delivery for invite/setup links (currently admin copies link manually)
- Edit user name/email; delete user; password reset
