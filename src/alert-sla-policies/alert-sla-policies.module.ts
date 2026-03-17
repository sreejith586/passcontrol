import { Module } from '@nestjs/common';
import { InfraModule } from '../infra/infra.module';
import { AccessModule } from '../access/access.module';
import { AuditModule } from '../audit/audit.module';
import { AlertEventsModule } from '../alert-events/alert-events.module';
import { AlertSlaPoliciesController } from './controllers/alert-sla-policies.controller';
import { AlertSlaPoliciesService } from './services/alert-sla-policies.service';
import { AlertSlaPolicyRepository } from './repositories/alert-sla-policy.repository';

@Module({
  imports: [InfraModule, AccessModule, AuditModule, AlertEventsModule],
  controllers: [AlertSlaPoliciesController],
  providers: [AlertSlaPoliciesService, AlertSlaPolicyRepository],
  exports: [AlertSlaPoliciesService],
})
export class AlertSlaPoliciesModule {}
