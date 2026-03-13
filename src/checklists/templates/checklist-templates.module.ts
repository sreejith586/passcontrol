import { Module } from '@nestjs/common';
import { InfraModule } from '../../infra/infra.module';
import { AccessModule } from '../../access/access.module';
import { AuditModule } from '../../audit/audit.module';
import { ChecklistTemplatesController } from './controllers/checklist-templates.controller';
import { ChecklistTemplatesService } from './services/checklist-templates.service';
import { ChecklistTemplatesRepository } from './repositories/checklist-templates.repository';

@Module({
  imports: [InfraModule, AccessModule, AuditModule],
  controllers: [ChecklistTemplatesController],
  providers: [ChecklistTemplatesService, ChecklistTemplatesRepository],
  exports: [ChecklistTemplatesService],
})
export class ChecklistTemplatesModule {}
