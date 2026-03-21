import { Module } from '@nestjs/common';
import { InfraModule } from '../../infra/infra.module';
import { AccessModule } from '../../access/access.module';
import { AuditModule } from '../../audit/audit.module';
import { ScopeValidationModule } from '../../common/scope-validation/scope-validation.module';
import { ChecklistTemplatesController } from './controllers/checklist-templates.controller';
import { ChecklistTemplatesService } from './services/checklist-templates.service';
import { ChecklistTemplatesRepository } from './repositories/checklist-templates.repository';

@Module({
  imports: [InfraModule, AccessModule, AuditModule, ScopeValidationModule],
  controllers: [ChecklistTemplatesController],
  providers: [ChecklistTemplatesService, ChecklistTemplatesRepository],
  exports: [ChecklistTemplatesService],
})
export class ChecklistTemplatesModule {}
