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

## Alert SLA

- `AlertSlaPolicy`: org-scoped policies with optional brandId/locationId/zoneId, severity, acknowledgeWithinMinutes, resolveWithinMinutes
- Resolved at alert creation; values snapshotted onto AlertEvent

## Hierarchy

- **Organization** → Brand → Location → Zone
- Templates/schedules/runs can scope to brand, location, zone
- All entities have `organizationId`
