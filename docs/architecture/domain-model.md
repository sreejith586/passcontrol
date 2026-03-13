# Domain Model

> Consolidated from existing design documents.

---

## Core Entities

### Identity & RBAC

- **User** – email, name, passwordHash, isActive
- **Organization** – tenant root
- **Brand** – org → brands
- **Location** – brand → locations (timezone)
- **Zone** – location → zones
- **Asset** – location, optional zone; assetType, status
- **Role** – organization-scoped; key, scope, isSystem
- **Permission** – key (unique)
- **RolePermission** – role ↔ permission
- **UserRoleAssignment** – user, organization, role; optional brandId, locationId for scope

### Files & Attachments

- **File** – metadata for a binary: organizationId, bucket, objectKey, fileName, mimeType, sizeBytes, checksum, uploadedBy, uploadedAt
- **Attachment** – links one file to one target; exactly one of: incidentId, taskId, checklistRunId, checklistRunResponseId, assetId; attachmentType (evidence, before_photo, etc.)

### Temperature

- **TemperaturePolicy** – org-scoped; brand/location/zone/asset nullable for hierarchy; minTemp, maxTemp, unit; breachGraceSeconds (future)
- **TemperatureReading** – org, location, zone, asset; sourceType, readingValue, unit, recordedAt; optional policyId, checklistRunId, checklistRunResponseId; isBreach, breachType

### Alert Events

- **AlertEvent** – org, brand/location/zone/asset; sourceType, sourceId; type, status (OPEN→ACKNOWLEDGED→RESOLVED); severity; triggeredAt, acknowledgedAt, resolvedAt

### Incidents & Tasks (schema present; modules TBD)

- **Incident** – org, brand/location/zone/asset; category, severity, title, description, status (OPEN, ACKNOWLEDGED, IN_PROGRESS, RESOLVED, CLOSED); reportedAt, reportedByUserId
- **Task** – org, location; incidentId (optional); sourceType, sourceId; title, status (OPEN, IN_PROGRESS, COMPLETED, CLOSED); assignedToId (TBD in schema)

### Checklist

- **ChecklistRun** – org; checklistTemplateId; locationId, zoneId; status; templateVersion, templateNameSnapshot
- **ChecklistRunResponse** – checklistRunId; result

### Audit

- **AuditLog** – organizationId, actorId; entityType, entityId; action; before, after (JSON); createdAt

---

## Key Relationships

- File ↔ Attachment: one file, many attachments (same file can attach to incident + task)
- Attachment → Incident/Task/ChecklistRun/ChecklistRunResponse/Asset: exactly one FK per row
- TemperatureReading → optional ChecklistRun, ChecklistRunResponse
- AlertEvent created by other services (e.g. TemperatureReadingsService on breach)
- TemperatureModule imports AlertEventsModule; AlertEventsModule does not import TemperatureModule
