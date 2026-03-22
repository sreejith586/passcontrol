import { Module } from '@nestjs/common';
import { InfraModule } from '../infra/infra.module';
import { AccessModule } from '../access/access.module';
import { AuditModule } from '../audit/audit.module';
import { RegionalSettingsModule } from '../regional-settings/regional-settings.module';
import { OrganizationSettingsController } from './controllers/organization-settings.controller';
import { OrganizationSettingsService } from './services/organization-settings.service';
import { OrganizationSettingsRepository } from './repositories/organization-settings.repository';

@Module({
  imports: [InfraModule, AccessModule, AuditModule, RegionalSettingsModule],
  controllers: [OrganizationSettingsController],
  providers: [OrganizationSettingsService, OrganizationSettingsRepository],
  exports: [OrganizationSettingsService],
})
export class OrganizationSettingsModule {}
