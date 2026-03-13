# Service Boundaries

> Consolidated from files-and-attachments-design, temperature-and-alerts-design, permission-matrix.

---

## Files vs Attachments

| Concept      | Responsibility                                                                 | Boundary |
|-------------|----------------------------------------------------------------------------------|----------|
| **Files**   | Metadata for binary object: org, bucket, objectKey, fileName, mimeType, sizeBytes, checksum, uploadedBy, uploadedAt | FilesModule; no direct attachment logic |
| **Attachments** | Links one file to exactly one target entity (incident, task, checklistRun, checklistRunResponse, asset); attachmentType | AttachmentsModule; validates target ownership; does not import FilesModule |

- FilesModule and AttachmentsModule are **independent**.
- AttachmentsModule uses Prisma and org context to validate file ownership; no FilesModule import.

---

## Temperature vs Alert Events

| Module         | Responsibility                                 | Boundary |
|----------------|-------------------------------------------------|----------|
| **Temperature** | Policies, readings, breach evaluation, policy resolution | Creates alerts via AlertEventsService.createFromPayload on breach |
| **AlertEvents** | Alert storage, list, acknowledge, resolve       | Does **not** import TemperatureModule |

- **Direction**: TemperatureModule → AlertEventsModule (one-way).
- AlertEventsModule has no dependency on Temperature.

---

## Cross-Module Calls

| Caller                  | Callee              | Purpose |
|-------------------------|---------------------|---------|
| TemperatureReadingsService | AlertEventsService  | Create alert on breach |
| AttachmentsService      | PrismaService       | Validate file, create attachment |
| FilesService            | AuditLogsService    | Audit file register |
| AttachmentsService      | AuditLogsService    | Audit attachment create/delete |

---

## Shared Services (Infra / Audit / Access)

- **PrismaService** – used by all modules needing DB; InfraModule (global)
- **AuditLogsService** – used by auth, files, attachments, temperature; AuditModule
- **AuthGuard, RbacGuard** – used by all domain controllers; AuthModule, AccessModule
- **CurrentTenantContext** – injects org/user from JWT; AccessModule

---

## Ownership Validation

- **Attachment create**: AttachmentOwnershipService validates exactly one target (incident, task, checklistRun, checklistRunResponse, asset) exists in org; file ownership validated via Prisma.
- **File access**: All file operations use tenant context (organizationId); no cross-org access.
- **All domain data**: Organization-scoped; services enforce via ctx.organizationId.
