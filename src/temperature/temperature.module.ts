import { Module } from '@nestjs/common';
import { InfraModule } from '../infra/infra.module';
import { AccessModule } from '../access/access.module';
import { AuditModule } from '../audit/audit.module';
import { AlertEventsModule } from '../alert-events/alert-events.module';
import { TemperaturePoliciesController } from './controllers/temperature-policies.controller';
import { TemperatureReadingsController } from './controllers/temperature-readings.controller';
import { TemperaturePoliciesService } from './services/temperature-policies.service';
import { TemperatureReadingsService } from './services/temperature-readings.service';
import { PolicyScopeService } from './services/policy-scope.service';
import { PolicyResolverService } from './services/policy-resolver.service';
import { BreachDetectionService } from './services/breach-detection.service';
import { TemperaturePoliciesRepository } from './repositories/temperature-policies.repository';
import { TemperatureReadingsRepository } from './repositories/temperature-readings.repository';

@Module({
  imports: [InfraModule, AccessModule, AuditModule, AlertEventsModule],
  controllers: [TemperaturePoliciesController, TemperatureReadingsController],
  providers: [
    TemperaturePoliciesService,
    TemperatureReadingsService,
    PolicyScopeService,
    PolicyResolverService,
    BreachDetectionService,
    TemperaturePoliciesRepository,
    TemperatureReadingsRepository,
  ],
  exports: [TemperaturePoliciesService, TemperatureReadingsService, PolicyResolverService, BreachDetectionService],
})
export class TemperatureModule {}
