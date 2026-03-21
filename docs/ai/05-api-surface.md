# API Surface

Base: `/v1` (versioned)

## Checklist Runs

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /checklist-runs/metrics | checklist.run.view | Dashboard counts (todayRuns, overdueRuns, failedRuns, totalRuns, alert counts) |
| GET | /checklist-runs/today | checklist.run.view | Runs for today (paginated) |
| GET | /checklist-runs/overdue | checklist.run.view | Overdue runs |
| GET | /checklist-runs/failed | checklist.run.view | Runs with failed items |
| GET | /checklist-runs/:id | checklist.run.view | Run by ID |
| POST | /checklist-runs/:id/submit | checklist.run.submit | Submit completed run |

## Checklist Run Items

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /checklist-run-items/summary | checklist.run.view | Dashboard summary (counts) |
| GET | /checklist-run-items/summary-by-location | checklist.run.view | Failed items summary grouped by location |
| GET | /checklist-run-items/summary-by-template | checklist.run.view | Failed items summary grouped by checklist template |
| GET | /checklist-run-items/trends/failures | checklist.run.view | Failed items trends over time (day/week/month) |
| GET | /checklist-run-items/failed | checklist.run.view | Failed items (paginated) |
| GET | /checklist-run-items/:id | checklist.run.view | Item with context |
| PATCH | /checklist-run-items/:id | checklist.run.update | Update item response |
| POST | /checklist-run-items/:id/attachments | checklist.run.update | Link attachment |
| POST | /checklist-run-items/:id/evidence | checklist.run.update | Multipart upload: create File + Attachment (EVIDENCE) linked to item. Field: file. Mime: image/jpeg, image/png, image/webp, image/gif. Max 50 MB. Run must be PENDING or IN_PROGRESS. |
| POST | /checklist-run-items/:id/temperature-readings | checklist.run.update | Add temperature reading |
| POST | /checklist-run-items/:id/acknowledge-alert | alert.acknowledge | Acknowledge related alert |
| POST | /checklist-run-items/:id/resolve-alert | alert.resolve | Resolve related alert |

## Alert Events

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /alert-events/trends | alert.view | Alert lifecycle trends over time |
| GET | /alert-events/escalations | alert.view | SLA-based alert escalations (breach flags, deadlines) |
| GET | /alert-events/escalations/summary | alert.view | Escalation summary (totals, breach counts, severity breakdown) |
| GET | /alert-events/escalations/summary-by-location | alert.view | Escalation summary grouped by location |
| GET | /alert-events/escalations/trends | alert.view | Time-series escalation counts (day/week/month buckets) |
| GET | /alert-events/escalations/prioritized | alert.view | Top N escalations by urgency (resolve/acknowledge breached, severity) |
| GET | /alert-events/sla-compliance | alert.view | SLA compliance metrics (within-SLA/breached counts and rates) |
| GET | /alert-events/insights/sla-compliance | alert.view | SLA compliance for alerts triggered in period (from, to; uses triggeredAt) |
| GET | /alert-events/insights/escalation-trend | alert.view | Daily buckets of triggered alerts with breached counts (days, default 7) |
| GET | /alert-events/insights/top-sources | alert.view | Top problem sources by alert count (limit, default 5) |
| GET | /alert-events | alert.view | List alerts (query: brandId, locationId, zoneId, assetId, type, status, severity, sourceType, assignedUserId, assignedToMe, unassignedOnly, from, to, page, limit, sort). Date-only from/to YYYY-MM-DD: from=gte start of day UTC; to=through end of day UTC |
| GET | /alert-events/:id | alert.view | Get alert |
| GET | /alert-events/:id/activities | alert.view | Activity timeline / audit trail |
| GET | /alert-events/:id/comments | alert.view | List comments (COMMENT, RESOLUTION_NOTE, REOPEN_NOTE) |
| POST | /alert-events/:id/comments | alert.view | Add comment or resolution note |
| POST | /alert-events/bulk-acknowledge | alert.acknowledge | Bulk acknowledge (max 100 IDs) |
| POST | /alert-events/bulk-resolve | alert.resolve | Bulk resolve (max 100 IDs, optional note; note required if org policy enabled) |
| POST | /alert-events/:id/assign | alert.assign | Assign alert to user |
| POST | /alert-events/:id/unassign | alert.assign | Unassign alert |
| POST | /alert-events/:id/acknowledge | alert.acknowledge | Acknowledge |
| POST | /alert-events/:id/resolve | alert.resolve | Resolve (resolution note required if org policy enabled) |
| POST | /alert-events/:id/reopen | alert.resolve | Reopen RESOLVED alert to OPEN (optional body `{ note?: string }`; note required if org policy enabled) |

## Roles

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /roles | user.view | List org-scoped roles with permissions (for invite, role visibility) |

## Users

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /users | user.view or alert.assign | List org-scoped users (id, name, email, isActive, roles; paginated) |
| POST | /users/invite | user.invite | Invite user by email; creates if new; assigns role; returns setupToken? when passwordHash is null |
| POST | /users/:id/roles | user.manage | Add role to user |
| DELETE | /users/:id/roles/:roleId | user.manage | Remove role from user |
| PATCH | /users/:id/status | user.manage | Activate/deactivate user (global account status) |

## Organization Settings (Alert Workflow)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /organization-settings/alert-workflow | alert.workflow-policy.view | Get workflow policy: `{ requireResolutionNoteOnResolve, requireReopenNoteOnReopen }` |
| PATCH | /organization-settings/alert-workflow | alert.workflow-policy.manage | Update workflow policy (partial: both fields optional) |

## Alert SLA Policies (Admin)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /alert-sla-policies | alert.sla-policy.view | List SLA policies (paginated) |
| GET | /alert-sla-policies/preview | alert.sla-policy.view | Preview which SLA would apply for severity/scope |
| GET | /alert-sla-policies/:id | alert.sla-policy.view | Get SLA policy by ID |
| POST | /alert-sla-policies | alert.sla-policy.manage | Create SLA policy |
| PATCH | /alert-sla-policies/:id | alert.sla-policy.manage | Update SLA policy |

## Onboarding

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | /onboarding/quick-setup | checklist.template.create | Creates starter template, schedule, and run. Returns `{ runId }`. Redirect to /checklist-runs/:runId. |

## Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/login | None | Login with email/password |
| POST | /auth/refresh | None | Refresh access token |
| POST | /auth/validate-setup-token | None | Validate password setup token; returns `{ valid, reason? }` |
| POST | /auth/set-password | None | Set password using setup token; returns `{ passwordSet: true }` |
| GET | /auth/me | JWT | Current user and permissions |

## Files

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | /files/init-upload | file.upload | Get upload intent (fileName, mimeType, sizeBytes); returns uploadIntent, suggestedFileId, bucket, objectKey |
| POST | /files | file.upload | Register file after upload (bucket, objectKey, fileName, mimeType, sizeBytes) |
| GET | /files/:id | file.view | Get file metadata |
| GET | /files/:id/content | file.view | Stream file bytes (Content-Type from mimeType, Content-Disposition inline) |

## Attachments

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | /attachments | attachment.create | Create attachment (fileId, attachmentType, exactly one of: incidentId, taskId, checklistRunId, checklistRunResponseId, assetId) |
| GET | /attachments | attachment.view | List attachments (requires filter: incidentId, taskId, checklistRunId, checklistRunResponseId, or assetId) |
| GET | /attachments/:id | attachment.view | Get attachment with file metadata |
| DELETE | /attachments/:id | attachment.delete | Delete attachment |

## Checklist Templates

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /checklist-templates | checklist.template.view | List templates (query: status, brandId, locationId, zoneId, page, limit) |
| GET | /checklist-templates/:id | checklist.template.view | Get template with sections and items |
| POST | /checklist-templates | checklist.template.create | Create template (DRAFT) |
| PATCH | /checklist-templates/:id | checklist.template.update | Update template (DRAFT only) |
| POST | /checklist-templates/:id/publish | checklist.template.publish | Publish template (DRAFT → PUBLISHED) |
| POST | /checklist-templates/:id/archive | checklist.template.archive | Archive template |

## Brands

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /brands | brand.view | List brands for organization |
| POST | /brands | brand.manage | Create brand (name) |
| GET | /brands/:id | brand.view | Get brand by ID |
| PATCH | /brands/:id | brand.manage | Update brand (name) |

## Locations

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /locations | location.view | List locations (query: brandId) |
| POST | /locations | location.manage | Create location (brandId, name, timezone) |
| GET | /locations/:id | location.view | Get location by ID (includes brand: { id, name }) |
| PATCH | /locations/:id | location.manage | Update location (brandId?, name?, timezone?) |

## Zones

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /zones | zone.view | List zones (query: locationId) |
| POST | /zones | zone.manage | Create zone (locationId, name) |
| GET | /zones/:id | zone.view | Get zone by ID (includes location: { id, name }) |
| PATCH | /zones/:id | zone.manage | Update zone (locationId?, name?) |

## Checklist Schedules

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /checklist-schedules | checklist.schedule.view | List schedules (query: checklistTemplateId, isActive, page, limit) |
| GET | /checklist-schedules/:id | checklist.schedule.view | Get schedule by ID |
| POST | /checklist-schedules | checklist.schedule.create | Create schedule (checklistTemplateId, name, timezone, rrule, startsAt?, endsAt?) |
| PATCH | /checklist-schedules/:id | checklist.schedule.update | Update schedule (partial: name, timezone, rrule, startsAt?, endsAt?) |
| POST | /checklist-schedules/:id/activate | checklist.schedule.activate | Activate schedule |
| POST | /checklist-schedules/:id/deactivate | checklist.schedule.deactivate | Deactivate schedule |
| POST | /checklist-schedules/:id/generate-run | checklist.run.generate | Generate run from schedule (optional body `{ dueAt?: string }`; v1 frontend sends empty body) |

Frontend v1: uses RRULE presets (Daily 6/9/18, Twice daily, Weekly Mon/Sun); no raw RRULE editor; no brand/location/zone scope in UI. Generate-run without dueAt creates run for schedule's next occurrence; on duplicate/day conflict, backend returns error with message.

Scope validation (Phase 14C.1): Checklist templates and schedules validate brandId, locationId, zoneId when provided — each must exist in org; if both brandId and locationId provided, location must belong to brand; if both locationId and zoneId provided, zone must belong to location.

## Other

- `/temperature-policies`, `/temperature-readings`, `/organization-settings`

## Response Shape

- `{ success: true, data: T }` via `ApiResponse.ok(data)`
- Paginated: `{ items, total, page, limit }`
