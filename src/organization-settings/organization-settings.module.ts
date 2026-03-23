import { Module } from '@nestjs/common';
import { InfraModule } from '../infra/infra.module';
import { AccessModule } from '../access/access.module';
import { AuditModule } from '../audit/audit.module';
import { RegionalSettingsModule } from '../regional-settings/regional-settings.module';
import { OrganizationSettingsController } from './controllers/organization-settings.controller';
import { OrganizationSettingsService } from './services/organization-settings.service';
import { OrganizationSettingsRepository } from './repositories/organization-settings.repository';
import { OrganizationEmailSettingsService } from './services/organization-email-settings.service';
import { OrganizationEmailSettingsRepository } from './repositories/organization-email-settings.repository';

@Module({
  imports: [InfraModule, AccessModule, AuditModule, RegionalSettingsModule],
  controllers: [OrganizationSettingsController],
  providers: [
    OrganizationSettingsService,
    OrganizationSettingsRepository,
    OrganizationEmailSettingsService,
    OrganizationEmailSettingsRepository,
  ],
  exports: [OrganizationSettingsService, OrganizationEmailSettingsService],
})
export class OrganizationSettingsModule {}
