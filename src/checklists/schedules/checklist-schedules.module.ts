import { Module } from '@nestjs/common';
import { InfraModule } from '../../infra/infra.module';
import { AccessModule } from '../../access/access.module';
import { AuditModule } from '../../audit/audit.module';
import { ChecklistSchedulesController } from './controllers/checklist-schedules.controller';
import { ChecklistSchedulesService } from './services/checklist-schedules.service';
import { ChecklistSchedulesRepository } from './repositories/checklist-schedules.repository';

@Module({
  imports: [InfraModule, AccessModule, AuditModule],
  controllers: [ChecklistSchedulesController],
  providers: [ChecklistSchedulesService, ChecklistSchedulesRepository],
  exports: [ChecklistSchedulesService],
})
export class ChecklistSchedulesModule {}
