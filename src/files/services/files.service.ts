import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { FilesRepository } from '../repositories/files.repository';
import { StorageServiceInterface } from '../storage/storage.interface';
import { STORAGE_SERVICE } from '../storage/storage.interface';
import { InitUploadDto } from '../dto/init-upload.dto';
import { RegisterFileDto } from '../dto/register-file.dto';
import { AuditLogsService } from '../../audit/services/audit-logs.service';
import { v4 as uuid } from 'uuid';

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

@Injectable()
export class FilesService {
  constructor(
    private readonly repo: FilesRepository,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageServiceInterface,
    private readonly audit: AuditLogsService,
  ) {}

  /**
   * Init upload: validate, generate key, return upload intent (placeholder or presigned URL later).
   */
  async initUpload(
    ctx: { organizationId: string; userId?: string },
    dto: InitUploadDto,
    options?: { imageOnly?: boolean },
  ) {
    this.validateMimeAndSize(dto.mimeType, dto.sizeBytes, options?.imageOnly);

    const key = `org/${ctx.organizationId}/${uuid()}/${dto.fileName}`;
    const bucket = 'uploads';
    const intent = await this.storage.getUploadIntent(bucket, key, {
      contentType: dto.mimeType,
      maxSizeBytes: Math.min(dto.sizeBytes, MAX_FILE_SIZE_BYTES),
    });

    return {
      uploadIntent: intent,
      suggestedFileId: uuid(),
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      sizeBytes: dto.sizeBytes,
      bucket: intent.bucket,
      objectKey: intent.objectKey,
    };
  }

  /**
   * Register file after client has completed upload (e.g. to storage or multipart to backend).
   */
  async registerFile(
    ctx: { organizationId: string; userId?: string },
    dto: RegisterFileDto,
  ) {
    this.validateMimeAndSize(dto.mimeType, dto.sizeBytes, false);

    const created = await this.repo.create({
      organizationId: ctx.organizationId,
      bucket: dto.bucket,
      objectKey: dto.objectKey,
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      sizeBytes: dto.sizeBytes,
      checksum: dto.checksum ?? null,
      uploadedByUserId: ctx.userId ?? null,
    });

    await this.audit.recordWrite('FILE_UPLOAD_REGISTER', ctx, created.id, {
      after: created,
    });
    return created;
  }

  async getById(ctx: { organizationId: string }, id: string) {
    const file = await this.repo.findById(ctx.organizationId, id);
    if (!file) throw new NotFoundException('File not found');
    return file;
  }

  /**
   * Validate mime type and size for evidence upload (image only, 1–50 MB).
   * Throws BadRequestException if invalid.
   */
  validateEvidenceFile(mimeType: string, sizeBytes: number): void {
    this.validateMimeAndSize(mimeType, sizeBytes, true);
  }

  private validateMimeAndSize(
    mimeType: string,
    sizeBytes: number,
    imageOnly?: boolean,
  ) {
    if (imageOnly && !ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      throw new BadRequestException(
        `Only image types allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
      );
    }
    if (sizeBytes <= 0 || sizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `sizeBytes must be between 1 and ${MAX_FILE_SIZE_BYTES}`,
      );
    }
  }
}
