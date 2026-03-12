import { IsUUID, IsEnum, IsOptional } from 'class-validator';
import { AttachmentType } from '../enums/attachment-type.enum';

/**
 * Exactly one of incidentId, taskId, checklistRunId, checklistRunResponseId, assetId must be set.
 * Validated in service.
 */
export class CreateAttachmentDto {
  @IsUUID()
  fileId: string;

  @IsEnum(AttachmentType)
  attachmentType: AttachmentType;

  @IsOptional()
  @IsUUID()
  incidentId?: string;

  @IsOptional()
  @IsUUID()
  taskId?: string;

  @IsOptional()
  @IsUUID()
  checklistRunId?: string;

  @IsOptional()
  @IsUUID()
  checklistRunResponseId?: string;

  @IsOptional()
  @IsUUID()
  assetId?: string;
}
