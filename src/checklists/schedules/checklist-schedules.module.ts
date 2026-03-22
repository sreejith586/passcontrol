import { Module } from '@nestjs/common';
import { InfraModule } from '../../infra/infra.module';
import { AccessModule } from '../../access/access.module';
import { AuditModule } from '../../audit/audit.module';
import { ScopeValidationModule } from '../../common/scope-validation/scope-validation.module';
import { UsersModule } from '../../users/users.module';
import { ChecklistSchedulesController } from './controllers/checklist-schedules.controller';
import { ChecklistSchedulesService } from './services/checklist-schedules.service';
import { ChecklistScheduleRecurrenceService } from './services/checklist-schedule-recurrence.service';
import { ChecklistSchedulesRepository } from './repositories/checklist-schedules.repository';
import { ChecklistScheduleRunGeneratorService } from './services/checklist-schedule-run-generator.service';
import { ChecklistScheduleCronService } from './services/checklist-schedule-cron.service';

@Module({
  imports: [InfraModule, AccessModule, AuditModule, ScopeValidationModule, UsersModule],
  controllers: [ChecklistSchedulesController],
  providers: [
    ChecklistSchedulesService,
    ChecklistScheduleRecurrenceService,
    ChecklistSchedulesRepository,
    ChecklistScheduleRunGeneratorService,
    ChecklistScheduleCronService,
  ],
  exports: [ChecklistSchedulesService, ChecklistScheduleRunGeneratorService],
})
export class ChecklistSchedulesModule {}
