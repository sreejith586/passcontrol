import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { InfraModule } from './infra/infra.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { AccessModule } from './access/access.module';
import { TemperatureModule } from './temperature/temperature.module';
import { AlertEventsModule } from './alert-events/alert-events.module';
import { AlertSlaPoliciesModule } from './alert-sla-policies/alert-sla-policies.module';
import { OrganizationSettingsModule } from './organization-settings/organization-settings.module';
import { FilesModule } from './files/files.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { ChecklistTemplatesModule } from './checklists/templates/checklist-templates.module';
import { ChecklistSchedulesModule } from './checklists/schedules/checklist-schedules.module';
import { ChecklistRunsModule } from './checklists/runs/checklist-runs.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { UsersModule } from './users/users.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    InfraModule,
    AuditModule,
    AuthModule,
    AccessModule,
    TemperatureModule,
    AlertEventsModule,
    AlertSlaPoliciesModule,
    OrganizationSettingsModule,
    FilesModule,
    AttachmentsModule,
    ChecklistTemplatesModule,
    ChecklistSchedulesModule,
    ChecklistRunsModule,
    OnboardingModule,
    UsersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
