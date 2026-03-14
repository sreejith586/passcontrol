import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LinkAttachmentToRunItemDto {
  @ApiProperty({ format: 'uuid', description: 'Attachment UUID to link as evidence' })
  @IsUUID()
  attachmentId: string;
}
