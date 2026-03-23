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
import { SettingsModule } from './settings/settings.module';
import { FilesModule } from './files/files.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { BrandsModule } from './brands/brands.module';
import { LocationsModule } from './locations/locations.module';
import { ZonesModule } from './zones/zones.module';
import { ChecklistTemplatesModule } from './checklists/templates/checklist-templates.module';
import { ChecklistSchedulesModule } from './checklists/schedules/checklist-schedules.module';
import { ChecklistRunsModule } from './checklists/runs/checklist-runs.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { UsersModule } from './users/users.module';
import { RegionalSettingsModule } from './regional-settings/regional-settings.module';
import { ReportsModule } from './reports/reports.module';
import { MailModule } from './notifications/mail/mail.module';
import { NotificationsModule } from './notifications/notifications.module';
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
    SettingsModule,
    FilesModule,
    AttachmentsModule,
    BrandsModule,
    LocationsModule,
    ZonesModule,
    ChecklistTemplatesModule,
    ChecklistSchedulesModule,
    ChecklistRunsModule,
    OnboardingModule,
    UsersModule,
    RegionalSettingsModule,
    ReportsModule,
    MailModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
