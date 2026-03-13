import { Module } from '@nestjs/common';
import { InfraModule } from './infra/infra.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { AccessModule } from './access/access.module';
import { TemperatureModule } from './temperature/temperature.module';
import { AlertEventsModule } from './alert-events/alert-events.module';
import { FilesModule } from './files/files.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { ChecklistTemplatesModule } from './checklists/templates/checklist-templates.module';
import { ChecklistSchedulesModule } from './checklists/schedules/checklist-schedules.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    InfraModule,
    AuditModule,
    AuthModule,
    AccessModule,
    TemperatureModule,
    AlertEventsModule,
    FilesModule,
    AttachmentsModule,
    ChecklistTemplatesModule,
    ChecklistSchedulesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
