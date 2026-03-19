# Phase 9 — Evidence Upload Endpoint Validation Report

**Date:** 2025-03-20  
**Objective:** Validate backend for `POST /v1/checklist-run-items/:id/evidence` multipart upload

---

## 1. Files Reviewed

| File | Purpose |
|------|---------|
| `src/files/services/files.service.ts` | Init upload, register file, mime/size validation |
| `src/files/storage/storage.interface.ts` | Storage abstraction |
| `src/files/storage/mock-storage.service.ts` | Mock storage (no real bytes stored) |
| `src/files/repositories/files.repository.ts` | File CRUD |
| `src/files/controllers/files.controller.ts` | Files HTTP endpoints |
| `src/files/dto/init-upload.dto.ts`, `register-file.dto.ts` | DTOs |
| `src/attachments/services/attachments.service.ts` | Create, link, list, delete attachments |
| `src/attachments/services/attachment-ownership.service.ts` | Target validation (incident, task, checklistRun, checklistRunResponse, asset) |
| `src/attachments/repositories/attachments.repository.ts` | Attachment CRUD |
| `src/attachments/controllers/attachments.controller.ts` | Attachments HTTP endpoints |
| `src/attachments/dto/create-attachment.dto.ts` | CreateAttachmentDto |
| `src/checklists/runs/controllers/checklist-run-items.controller.ts` | Run item endpoints |
| `src/checklists/runs/services/checklist-runs.service.ts` | linkAttachmentToRunItem, run status checks |
| `src/checklists/runs/repositories/checklist-runs.repository.ts` | findRunItemById, findRunById |
| `prisma/schema.prisma` | File, Attachment, ChecklistRunItemSnapshot models |
| `docs/files-and-attachments-design.md` | Design doc |
| `package.json` | Dependencies (multer in lockfile via platform-express) |

---

## 2. Current Reusable Building Blocks

| Block | Location | Reuse |
|-------|----------|-------|
| Mime/size validation | `FilesService.validateMimeAndSize()` | Private; extract or call via new FilesService method |
| ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE_BYTES | `FilesService` | 50 MB max; image types: jpeg, png, webp, gif |
| File record creation | `FilesService.registerFile()` | Accepts ctx, RegisterFileDto (bucket, objectKey, fileName, mimeType, sizeBytes, checksum?) |
| Attachment creation | `AttachmentsService.create()` | Accepts ctx, CreateAttachmentDto (fileId, attachmentType, exactly one target) |
| Target validation | `AttachmentOwnershipService.validateTarget()` | Supports `checklistRunResponseId` → maps to `checklistRunItemSnapshotId` |
| Run status check | `ChecklistRunsService.linkAttachmentToRunItem` | PENDING/IN_PROGRESS only; COMPLETED rejected |
| Item lookup | `ChecklistRunsRepository.findRunItemById()` | Returns item with checklistRun; org-scoped |
| Attachment type | `AttachmentType.EVIDENCE` | Enum value for evidence |

---

## 3. Current Storage Behavior

| Aspect | Current State |
|--------|---------------|
| **Storage interface** | `getUploadIntent`, `confirmUpload?`, `deleteObject`, `getReadUrl?` — no method to save raw bytes |
| **Mock storage** | Returns placeholder intent; `uploadUrl: undefined`; `confirmUpload` is no-op; no bytes persisted |
| **File persistence** | `FilesRepository.create()` writes File metadata only; no binary storage |
| **Multer / multipart** | Not used in controllers; `@nestjs/platform-express` provides body parsing; multer is transitive dep |
| **Storage provider** | MockStorageService; no S3/local disk write for file bytes |

**Gap:** There is no `saveBytes` or equivalent on the storage interface. To support multipart, the storage layer must be extended to accept and persist file bytes.

---

## 4. Proposed Insertion Point

| Layer | Insertion |
|-------|-----------|
| **Controller** | `ChecklistRunItemsController` — new `POST :id/evidence` with `FileInterceptor('file')` |
| **Service** | `ChecklistRunsService` — new `uploadEvidence(ctx, itemId, file: Express.Multer.File)` |
| **Storage** | Extend `StorageServiceInterface` with `saveBytes(bucket, key, buffer, contentType): Promise<void>` |
| **Mock storage** | Implement `saveBytes` by writing to configurable local path (e.g. `./uploads` or env) |

**Rationale:** Checklist run items controller already hosts `POST :id/attachments` (link) and `POST :id/temperature-readings`. Evidence upload is item-scoped; keeping it here preserves cohesion. `ChecklistRunsService` already has run status validation and calls `AttachmentsService`; it is the natural orchestrator.

---

## 5. Proposed Endpoint Contract

```
POST /v1/checklist-run-items/:id/evidence
Content-Type: multipart/form-data
Body: file (required) — single file field

Path param: id = ChecklistRunItemSnapshot.id

Response: 201 Created
{
  "success": true,
  "data": {
    "id": "<attachment-uuid>",
    "fileId": "<file-uuid>",
    "attachmentType": "EVIDENCE",
    "checklistRunItemSnapshotId": "<item-id>",
    "createdAt": "<iso>",
    "file": {
      "id": "<file-uuid>",
      "fileName": "...",
      "mimeType": "...",
      "sizeBytes": 12345,
      "uploadedAt": "<iso>"
    }
  }
}
```

**Consistency:** Matches `AttachmentsRepository.create` which `include: { file: true }`; response shape aligns with `POST /attachments` and `linkToChecklistRunItem`.

---

## 6. Validation and Security Rules to Enforce

| Rule | Source | Implementation |
|------|--------|-----------------|
| **Permission** | checklist.run.update (same as link attachment) | `@RequirePermissions('checklist.run.update')` |
| **Org scoping** | Tenant context | `findRunItemById(organizationId, id)`; ctx from `CurrentTenantContext` |
| **Item existence** | NotFoundException | `findRunItemById` returns null → 404 |
| **Run status** | PENDING or IN_PROGRESS | Reuse logic from `linkAttachmentToRunItem`; reject COMPLETED |
| **File size** | 1–50 MB | Reuse `FilesService` validation (or shared helper) |
| **Mime types** | Image only for evidence | Use `FilesService.initUpload(..., { imageOnly: true })` validation |
| **Evidence timing** | Before run submit | Same as link: allowed for PENDING/IN_PROGRESS; not restricted to FAIL items |
| **Duplicate uploads** | Allowed | Multiple evidence files per item allowed (no uniqueness constraint) |

**Evidence and FAIL:** Current design does not restrict evidence to FAIL items. `linkAttachmentToRunItem` allows linking for any PENDING/IN_PROGRESS run. Recommend keeping the same rule: allow evidence upload as long as run is not COMPLETED. Business rules for `requiresEvidenceOnFail` are enforced at submit time, not at upload time.

---

## 7. Exact Services/Repositories to Reuse

| Service/Repository | Method | Purpose |
|-------------------|--------|---------|
| `ChecklistRunsRepository` | `findRunItemById(organizationId, itemId)` | Validate item exists, get run for status check |
| `ChecklistRunsService` | Run status check logic (inline or extracted) | Reject COMPLETED runs |
| `FilesService` | `registerFile(ctx, dto)` | Create File record after bytes are stored |
| `FilesService` | `validateMimeAndSize` (or new public method) | Mime/size validation |
| `AttachmentsService` | `create(ctx, dto)` | Create attachment with fileId, attachmentType: EVIDENCE, checklistRunResponseId: itemId |
| `AttachmentsRepository` | Via `AttachmentsService.create` | Persist attachment with `include: { file: true }` |
| `AuditLogsService` | Via FilesService, AttachmentsService | FILE_UPLOAD_REGISTER, ATTACHMENT_CREATE |

**AttachmentOwnershipService:** Use indirectly via `AttachmentsService.create`. Pass `CreateAttachmentDto` with `fileId`, `attachmentType: 'EVIDENCE'`, `checklistRunResponseId: itemId`. `validateTarget` will validate `ChecklistRunItemSnapshot` exists and return `checklistRunItemSnapshotId`.

**Do not use:** `AttachmentsService.linkToChecklistRunItem` — that links an existing attachment to an item. For upload we create a new attachment already linked to the item.

---

## 8. Risks / Constraints in Current Codebase

| Risk | Mitigation |
|------|------------|
| **No storage saveBytes** | Add `saveBytes` to interface; MockStorageService writes to local disk |
| **FilesModule not imported by ChecklistRunsModule** | Import FilesModule in ChecklistRunsModule for `uploadEvidence` |
| **File.organizationId nullable** | Schema has `organizationId String?`; ensure it is set from ctx |
| **AttachmentOwnershipService expects exactly one target** | Use `checklistRunResponseId: itemId`; no other target fields |
| **CreateAttachmentDto has no checklistRunItemSnapshotId** | DTO uses `checklistRunResponseId`; ownership maps to `checklistRunItemSnapshotId` |
| **Multer file field name** | Use `FileInterceptor('file')`; document field name for frontend |
| **checksum optional** | Omit for multipart MVP; can add later |
| **Local storage path** | Use env var (e.g. `UPLOADS_DIR`) or default `./uploads`; ensure dir exists |

---

## 9. Final Recommendation: Safest Implementation Approach

### Step 1 — Extend Storage Interface

Add to `StorageServiceInterface`:

```ts
saveBytes?(bucket: string, key: string, buffer: Buffer, contentType: string): Promise<void>;
```

Implement in `MockStorageService`: write to `./uploads/{bucket}/{key}` (or configurable path). Create parent dirs if needed.

### Step 2 — Add Orchestrator in ChecklistRunsService

New method `uploadEvidence(ctx, itemId, file: Express.Multer.File)`:

1. Call `findRunItemById`; throw NotFoundException if null.
2. Check run status: reject if COMPLETED or not PENDING/IN_PROGRESS (reuse existing pattern).
3. Validate mime (image types) and size (1–50 MB) — extract `validateMimeAndSize` to a shared helper or call FilesService with a new public method.
4. Generate key: `org/${ctx.organizationId}/${uuid()}/${file.originalname}`.
5. Call `storage.saveBytes('uploads', key, file.buffer, file.mimetype)`.
6. Call `FilesService.registerFile(ctx, { bucket: 'uploads', objectKey: key, fileName, mimeType, sizeBytes })`.
7. Call `AttachmentsService.create(ctx, { fileId: fileRecord.id, attachmentType: 'EVIDENCE', checklistRunResponseId: itemId })`.
8. Return attachment with file (AttachmentsRepository already includes file).

### Step 3 — Add Controller Endpoint

In `ChecklistRunItemsController`:

```ts
@Post(':id/evidence')
@RequirePermissions('checklist.run.update')
@UseInterceptors(FileInterceptor('file'))
async uploadEvidence(
  @CurrentTenantContext() ctx: TenantContext,
  @Param('id') id: string,
  @UploadedFile() file: Express.Multer.File,
) {
  if (!file) throw new BadRequestException('File is required');
  const attachment = await this.service.uploadEvidence(ctx, id, file);
  return ApiResponse.created(attachment);
}
```

### Step 4 — Module Wiring

- Import `FilesModule` in `ChecklistRunsModule`.
- Inject `FilesService` and `STORAGE_SERVICE` (or `StorageServiceInterface`) into `ChecklistRunsService` for `uploadEvidence`.

### Step 5 — Multer Configuration (Optional)

Add `MulterModule` or configure limits in `FileInterceptor` to enforce max size at the edge (e.g. 50 MB) and avoid loading oversized payloads.

---

**Summary:** One business endpoint; reuse FilesService, AttachmentsService, and existing run status checks. Extend storage with `saveBytes` for multipart. Keep validation and permissions aligned with `linkAttachmentToRunItem`. Response shape matches existing attachment responses with nested file.
