# API Surface

Base: `/v1` (versioned)

## Checklist Runs

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /checklist-runs/metrics | checklist.run.view | Dashboard counts |
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
| GET | /alert-events | alert.view | List alerts |
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

## Other

- `/auth`, `/files`, `/attachments`, `/temperature-policies`, `/temperature-readings`, `/checklist-templates`, `/checklist-schedules`, `/organization-settings`

## Response Shape

- `{ success: true, data: T }` via `ApiResponse.ok(data)`
- Paginated: `{ items, total, page, limit }`
