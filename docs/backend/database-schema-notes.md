# Database Schema Notes

> Consolidated from Prisma schema and design docs.

---

## Naming

- **Prisma models**: PascalCase (e.g. `TemperaturePolicy`)
- **DB tables**: snake_case via `@@map` (e.g. `temperature_policies`)
- **Columns in schema**: camelCase; mapped to snake_case with `@map` (e.g. `organizationId` → `organization_id`)

---

## Identity & RBAC

- **User**: passwordHash nullable (for SSO future); isActive; soft delete via deletedAt
- **UserRoleAssignment**: brandId, locationId nullable for org-wide vs scoped roles
- **Role**: organizationId nullable for system roles; scope, key for lookup

---

## Files & Attachments

- **File**: organizationId nullable (for edge cases); bucket, objectKey required; no storageProvider in current schema (schema uses bucket directly)
- **Attachment**: Exactly one of incidentId, taskId, checklistRunId, checklistRunResponseId, assetId non-null per row. attachmentType stores purpose (evidence, before_photo, etc.)
- **File vs Attachment**: File is metadata only; Attachment links file to one entity. Deleting attachment does not delete file; orphan cleanup TBD.

---

## Temperature

- **TemperaturePolicy**: brandId, locationId, zoneId, assetId all nullable; hierarchy used for policy resolution (asset > zone > location > brand/org)
- **TemperatureReading**: sourceType (e.g. MANUAL, SENSOR); breachType (NONE, LOW, HIGH); rawPayloadJson for ingestion metadata; policyId optional when client provides explicit policy

---

## Alert Events

- **AlertEvent**: sourceType, sourceId reference originating system (e.g. temperature breach); status OPEN → ACKNOWLEDGED → RESOLVED; acknowledgedAt, resolvedAt nullable

---

## Incidents & Tasks

- **Incident**: category, severity, title, description; status OPEN, ACKNOWLEDGED, IN_PROGRESS, RESOLVED, CLOSED
- **Task**: sourceType (MANUAL, INCIDENT, CHECKLIST_FAILURE, ALERT_EVENT), sourceId; status OPEN, IN_PROGRESS, COMPLETED, CLOSED; incidentId optional for follow-up tasks
- Task.locationId required; Incident.locationId optional in schema

---

## Checklist

- **ChecklistRun**: templateVersion, templateNameSnapshot stored at run time (immutable); no FK to ChecklistTemplate (template may be versioned elsewhere)
- **ChecklistRunResponse**: result; links to ChecklistRun only

---

## Audit

- **AuditLog**: entityType, entityId, action; before/after JSON; actorId, organizationId nullable (for system or unauthenticated events)
