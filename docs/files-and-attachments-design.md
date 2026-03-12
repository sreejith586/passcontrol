# Files & Attachments – Design Summary

## 1. Module / folder structure

```
src/
  files/
    files.module.ts
    controllers/
      files.controller.ts
    services/
      files.service.ts
    repositories/
      files.repository.ts
    storage/
      storage.interface.ts
      mock-storage.service.ts
    dto/
      init-upload.dto.ts
      register-file.dto.ts

  attachments/
    attachments.module.ts
    controllers/
      attachments.controller.ts
    services/
      attachments.service.ts
      attachment-ownership.service.ts
    repositories/
      attachments.repository.ts
    dto/
      create-attachment.dto.ts
      list-attachments.dto.ts
    enums/
      attachment-type.enum.ts
```

- **FilesModule** and **AttachmentsModule** are independent; AttachmentsModule does not import FilesModule (it only needs Prisma and org context to validate file ownership when creating an attachment).

---

## 2. File vs attachment distinction

| Concept | Responsibility |
|--------|-----------------|
| **File** | Metadata record for a single binary object in storage: organization, bucket, key, fileName, mimeType, sizeBytes, checksum, uploadedBy, uploadedAt. One file can be referenced by multiple attachments (e.g. same photo attached to an incident and a task) if business rules allow; MVP keeps usage simple. |
| **Attachment** | Links one file to exactly one target entity via explicit FK: incident, task, checklist_run, checklist_run_response, or asset. Stores attachment type (evidence, before_photo, after_photo, signature, document, manual). |

- Files are **tenant-scoped** (organizationId). Attachments are **tenant-scoped** and **entity-scoped** (one of the FKs).
- Deleting an attachment does not delete the file. File lifecycle (e.g. orphan cleanup) can be handled later.

---

## 3. Upload flow summary (MVP)

1. **Client calls** `POST /v1/files/init-upload` with fileName, mimeType, sizeBytes (optional checksum).
2. **Backend** validates tenant, mime type, and size (with optional image-only restriction). Generates a storage key (e.g. `org/{orgId}/{uuid}/{fileName}`) and calls **StorageService.getUploadIntent**.
3. **Backend returns** upload intent (objectKey, bucket, optional uploadUrl/headers for future presigned URLs). No real bytes uploaded in init.
4. **Client** uploads the binary (e.g. multipart to a separate endpoint or directly to storage when presigned URLs are implemented).
5. **Client calls** `POST /v1/files` with storageProvider, bucket, objectKey, fileName, mimeType, sizeBytes (optional checksum) to **register** the file record.
6. **Client calls** `POST /v1/attachments` with fileId, attachmentType, and **exactly one** of incidentId, taskId, checklistRunId, checklistRunResponseId, assetId to link the file to an entity.

MVP does not implement server-side multipart receive; the storage layer is abstracted so that later you can switch to presigned PUT/POST without changing the rest of the flow.

---

## 4. Ownership validation strategy

- **File**  
  - Every file has `organizationId`. All file access (get, register) uses tenant context; no cross-org access.

- **Attachment create**  
  - **AttachmentOwnershipService.validateTarget**: Exactly one of incidentId, taskId, checklistRunId, checklistRunResponseId, assetId must be set. That entity must exist and belong to the same organization (via Prisma findFirst with organizationId).
  - **File ownership**: The fileId must reference a file that belongs to the same organization (Prisma findFirst file by id and organizationId).
  - Reject requests with multiple targets or with a target not in the org.

- **Attachment list/delete**  
  - All queries filter by organizationId. Delete is restricted by RBAC (e.g. attachment.delete permission).

---

## 5. Access control (summary)

- **file.upload** – init-upload, register file.
- **file.view** – get file by id.
- **attachment.create** – create attachment (file + target in org).
- **attachment.view** – list attachments (with filters), get by id.
- **attachment.delete** – delete attachment (destructive; restrict to supervisors/managers if desired).

All endpoints use AuthGuard and RbacGuard; tenant context is enforced in services.

---

## 6. Storage abstraction

- **StorageServiceInterface**: `getUploadIntent(bucket, key, options?)`, `confirmUpload?(bucket, key, sizeBytes)`, `deleteObject(bucket, key)`, `getReadUrl?(bucket, key)`.
- **MVP**: MockStorageService returns placeholder intent (no uploadUrl); no real bytes stored. File record is still created on register; actual object storage can be added later.
- Controllers and FilesService do not depend on S3 or any concrete provider; they depend on the interface (injected via STORAGE_SERVICE token).

---

## 7. Audit logging

- **FILE_UPLOAD_REGISTER** – when a file record is created (register-file).
- **ATTACHMENT_CREATE** – when an attachment is created.
- **ATTACHMENT_DELETE** – when an attachment is deleted (before state recorded).

---

## 8. Schema expectations (Prisma)

- **File**: id, organizationId, storageProvider, bucket, objectKey (or key), fileName, mimeType (or contentType), sizeBytes, checksum?, uploadedByUserId?, uploadedAt. Adjust repository field names to match your generated client.
- **Attachment**: id, organizationId, fileId, incidentId?, taskId?, checklistRunId?, checklistRunResponseId?, assetId?, attachmentType (or purpose), createdAt. Exactly one of the entity FKs non-null per row.

---

## 9. Intentionally deferred to later

- Presigned upload URLs and client direct-to-S3 upload.
- Server-side multipart upload endpoint receiving bytes.
- Image processing (resize, thumbnails), OCR, or AI analysis.
- Image moderation or validation pipelines.
- Attachment rules by checklist item type (e.g. require evidence on fail).
- Mandatory evidence enforcement for failed checklist items.
- Orphan file cleanup and storage lifecycle policies.
- Full cloud provider provisioning (buckets, IAM); MVP uses a configurable bucket name and mock/local storage.
