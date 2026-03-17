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
| GET | /alert-events | alert.view | List alerts |
| GET | /alert-events/:id | alert.view | Get alert |
| POST | /alert-events/:id/acknowledge | alert.acknowledge | Acknowledge |
| POST | /alert-events/:id/resolve | alert.resolve | Resolve |

## Other

- `/auth`, `/files`, `/attachments`, `/temperature-policies`, `/temperature-readings`, `/checklist-templates`, `/checklist-schedules`

## Response Shape

- `{ success: true, data: T }` via `ApiResponse.ok(data)`
- Paginated: `{ items, total, page, limit }`
