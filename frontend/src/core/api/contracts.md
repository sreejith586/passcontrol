# API Contract Verification

Endpoints verified against backend. All use `ApiResponse.ok(data)` → `{ success: true, data: T }`.

## Auth
- `POST /auth/login` — body: `{ email, password }` → `{ accessToken, refreshToken, expiresIn, user }`
- `GET /auth/me` — → `{ user, organizationId, roles, permissions }`
- `POST /auth/refresh` — body: `{ refreshToken }` → `{ accessToken, refreshToken, expiresIn }` (not used by frontend)

## Alerts
- `GET /alert-events` — query: brandId, locationId, zoneId, assetId, type, status, severity, sourceType, assignedUserId, assignedToMe (bool), unassignedOnly (bool), from, to, page, limit, sort → `{ items, total, page, limit }`
- `GET /alert-events/:id` — → AlertEvent
- `GET /alert-events/:id/activities` — → AlertEventActivity[]
- `GET /alert-events/:id/comments` — → AlertEventComment[]
- `POST /alert-events/:id/acknowledge` — no body → AlertEvent
- `POST /alert-events/:id/resolve` — body: `{ resolutionNote? }` → AlertEvent
- `POST /alert-events/:id/reopen` — body: `{ note? }` → AlertEvent
- `POST /alert-events/:id/assign` — body: `{ assignedToUserId }` → AlertEvent
- `POST /alert-events/:id/unassign` — no body → AlertEvent
- `POST /alert-events/:id/comments` — body: `{ type, body }` → AlertEventComment

## Escalations
- `GET /alert-events/escalations` — query: brandId, locationId, zoneId, severity, status, assignedUserId, assignedToMe, unassignedOnly, onlyBreached, page, limit → `{ items, total, page, limit }`
- `GET /alert-events/escalations/summary` — query: brandId, locationId, zoneId, severity, status → `{ totalActiveAlerts, acknowledgeBreached, resolveBreached, bySeverity }`
- `GET /alert-events/escalations/prioritized` — query: brandId, locationId, zoneId, severity, status, assignedUserId, assignedToMe, unassignedOnly, limit → `{ items }`

## Organization Settings
- `GET /organization-settings/alert-workflow` — → `{ requireResolutionNoteOnResolve, requireReopenNoteOnReopen }`
- `PATCH /organization-settings/alert-workflow` — body: `{ requireResolutionNoteOnResolve?, requireReopenNoteOnReopen? }` → same shape

## Dashboard
- `GET /checklist-runs/metrics` — query: brandId, locationId, zoneId, timezone, date → `{ todayRuns, overdueRuns, failedRuns, openAlerts, acknowledgedAlerts, resolvedAlertsToday }`
