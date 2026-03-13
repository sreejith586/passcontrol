# Entity Relationship Diagram (Conceptual)

> Derived from `prisma/schema.prisma`. Logical relationships only.

---

## Identity & RBAC

```
Organization 1──* Brand
Organization 1──* Location (via Brand)
Organization 1──* UserRoleAssignment
Organization 1──* File, Attachment, Incident, Task, AlertEvent
Organization 1──* TemperaturePolicy, TemperatureReading
Organization 1──* ChecklistRun, ChecklistRunResponse
Organization 1──* AuditLog

User 1──* UserRoleAssignment
Role 1──* UserRoleAssignment
Role M──M Permission (via RolePermission)

Brand 1──* Location
Location 1──* Zone
Location 1──* Asset
Zone 1──* Asset
Location 1──* Incident, Task
```

---

## Files & Attachments

```
Organization *──1 File (optional org)
File 1──* Attachment
Attachment *──1 Incident (optional)
Attachment *──1 Task (optional)
Attachment *──1 ChecklistRun (optional)
Attachment *──1 ChecklistRunResponse (optional)
Attachment *──1 Asset (optional)
```

Exactly one of incidentId, taskId, checklistRunId, checklistRunResponseId, assetId per Attachment.

---

## Temperature & Alerts

```
Organization 1──* TemperaturePolicy
Organization 1──* TemperatureReading
Organization 1──* AlertEvent
```

TemperatureReading: optional policyId, checklistRunId, checklistRunResponseId.  
AlertEvent: sourceType, sourceId (references external entities like temperature readings).

---

## Incidents & Tasks

```
Organization 1──* Incident
Organization 1──* Task
Location 1──* Incident, Task
Incident 1──* Task (via Task.incidentId)
```

---

## Checklist

```
Organization 1──* ChecklistRun
ChecklistRun 1──* ChecklistRunResponse
Organization 1──* ChecklistRunResponse
```

ChecklistRun: templateVersion, templateNameSnapshot (immutable snapshot at run time).

---

## Audit

```
Organization *──1 AuditLog (optional)
User *──1 AuditLog (optional, as actor)
```

AuditLog: entityType, entityId, action, before, after.
