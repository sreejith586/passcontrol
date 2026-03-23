import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { AuditModule } from '../audit/audit.module';
import { OrganizationSettingsModule } from '../organization-settings/organization-settings.module';
import { SettingsController } from './controllers/settings.controller';
import { SettingsService } from './services/settings.service';

@Module({
  imports: [AccessModule, AuditModule, OrganizationSettingsModule],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
