# Domain Model

## Checklist Engine

```
ChecklistTemplate (versioned, publish/archive)
  └── ChecklistTemplateSection (sortOrder)
        └── ChecklistTemplateItem (itemType, severity, requiresEvidenceOnFail, requiresCommentOnFail)

ChecklistSchedule (rrule, timezone, brand/location/zone)
  └── references ChecklistTemplate

ChecklistRun (status: PENDING | IN_PROGRESS | COMPLETED)
  └── ChecklistRunSectionSnapshot (titleSnapshot, sortOrder)
        └── ChecklistRunItemSnapshot (labelSnapshot, severitySnapshot, result, requiresEvidenceOnFailSnapshot, ...)
```

## Execution Rules

- **PENDING → IN_PROGRESS:** First item update
- **Submit:** Sets COMPLETED; validates required items + compliance
- **Completed runs:** Immutable

## Evidence

- `Attachment.checklistRunItemSnapshotId`
- `TemperatureReading.checklistRunItemSnapshotId`

## Alerts

- `AlertEvent.sourceType = 'CHECKLIST_RUN_ITEM'`
- `AlertEvent.sourceId = ChecklistRunItemSnapshot.id`
- Status: OPEN → ACKNOWLEDGED → RESOLVED
- SLA snapshot: `acknowledgeWithinMinutes`, `resolveWithinMinutes` (resolved at creation from AlertSlaPolicy)
- Assignment: `assignedToUserId`, `assignedAt`, `assignedByUserId` (nullable); assign/unassign for OPEN/ACKNOWLEDGED only

## Alert SLA

- `AlertSlaPolicy`: org-scoped policies with optional brandId/locationId/zoneId, severity, acknowledgeWithinMinutes, resolveWithinMinutes
- Resolved at alert creation; values snapshotted onto AlertEvent

## Alert Activity Timeline

- `AlertEventActivity`: type (CREATED, ACKNOWLEDGED, RESOLVED, REOPENED, ASSIGNED, UNASSIGNED, REASSIGNED), actorUserId, fromStatus, toStatus, fromAssignedToUserId, toAssignedToUserId, comment, metadata
- Auto-logged on: create, acknowledge, resolve, assign, unassign
- Indexes: (organizationId, alertEventId, createdAt), (alertEventId, createdAt)

## Alert Comments (separate domain)

- `AlertEventComment`: type (COMMENT, RESOLUTION_NOTE, REOPEN_NOTE), authorUserId (nullable; null for system-created REOPEN_NOTE when no actor), body (max 4000 chars), createdAt
- COMMENT and RESOLUTION_NOTE: user-added via `POST /v1/alert-events/:id/comments`
- REOPEN_NOTE: system-created when reopen is called with a note; not user-addable
- Separate from AlertEventActivity; no merged timeline
- Allowed on OPEN, ACKNOWLEDGED, RESOLVED
- Indexes: (organizationId, alertEventId, createdAt), (alertEventId, createdAt)

## Organization-level alert policy

- `Organization.requireResolutionNoteOnResolve` (boolean, default false): when true, resolving an alert requires a non-empty resolution note (trimmed; whitespace-only rejected)
- `Organization.requireReopenNoteOnReopen` (boolean, default false): when true, reopening an alert requires a non-empty note (trimmed; whitespace-only rejected); note stored as REOPEN_NOTE comment
- API: `GET /v1/organization-settings/alert-workflow`, `PATCH /v1/organization-settings/alert-workflow`; both fields; permissions `alert.workflow-policy.view`, `alert.workflow-policy.manage`

## Hierarchy

- **Organization** → Brand → Location → Zone
- Templates/schedules/runs can scope to brand, location, zone
- All entities have `organizationId`
