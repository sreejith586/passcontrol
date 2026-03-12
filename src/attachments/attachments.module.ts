import { Module } from '@nestjs/common';
import { InfraModule } from '../infra/infra.module';
import { AccessModule } from '../access/access.module';
import { AuditModule } from '../audit/audit.module';
import { AttachmentsController } from './controllers/attachments.controller';
import { AttachmentsService } from './services/attachments.service';
import { AttachmentOwnershipService } from './services/attachment-ownership.service';
import { AttachmentsRepository } from './repositories/attachments.repository';

@Module({
  imports: [InfraModule, AccessModule, AuditModule],
  controllers: [AttachmentsController],
  providers: [
    AttachmentsService,
    AttachmentOwnershipService,
    AttachmentsRepository,
  ],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
