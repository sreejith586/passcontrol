import { Module } from '@nestjs/common';
import { InfraModule } from '../../infra/infra.module';
import { AccessModule } from '../../access/access.module';
import { AuditModule } from '../../audit/audit.module';
import { AlertEventsModule } from '../../alert-events/alert-events.module';
import { AttachmentsModule } from '../../attachments/attachments.module';
import { FilesModule } from '../../files/files.module';
import { TemperatureModule } from '../../temperature/temperature.module';
import { DomainEventsModule } from '../../common/domain-events/domain-events.module';
import { UsersModule } from '../../users/users.module';
import { RegionalSettingsModule } from '../../regional-settings/regional-settings.module';
import { ChecklistRunsController } from './controllers/checklist-runs.controller';
import { ChecklistRunItemsController } from './controllers/checklist-run-items.controller';
import { ChecklistRunsService } from './services/checklist-runs.service';
import { ChecklistRunsRepository } from './repositories/checklist-runs.repository';
import { ChecklistRunItemsService } from './services/checklist-run-items.service';
import { ChecklistRunItemsRepository } from './repositories/checklist-run-items.repository';

@Module({
  imports: [InfraModule, AccessModule, AuditModule, AlertEventsModule, AttachmentsModule, FilesModule, TemperatureModule, DomainEventsModule, UsersModule, RegionalSettingsModule],
  controllers: [ChecklistRunsController, ChecklistRunItemsController],
  providers: [
    ChecklistRunsService,
    ChecklistRunsRepository,
    ChecklistRunItemsService,
    ChecklistRunItemsRepository,
  ],
  exports: [ChecklistRunsService, ChecklistRunItemsService],
})
export class ChecklistRunsModule {}
