import { Module, forwardRef } from '@nestjs/common';
import { InfraModule } from '../infra/infra.module';
import { AccessModule } from '../access/access.module';
import { AuditModule } from '../audit/audit.module';
import { DomainEventsModule } from '../common/domain-events/domain-events.module';
import { AlertEventActivitiesModule } from '../alert-event-activities/alert-event-activities.module';
import { AlertEventCommentsModule } from '../alert-event-comments/alert-event-comments.module';
import { AlertEventsController } from './controllers/alert-events.controller';
import { AlertEventsService } from './services/alert-events.service';
import { AlertEventsRepository } from './repositories/alert-events.repository';
import { AlertSlaPolicyRepository } from './repositories/alert-sla-policy.repository';
import { AlertSlaResolverService } from './services/alert-sla-resolver.service';

@Module({
  imports: [
    InfraModule,
    AccessModule,
    AuditModule,
    forwardRef(() => DomainEventsModule),
    forwardRef(() => AlertEventActivitiesModule),
    forwardRef(() => AlertEventCommentsModule),
  ],
  controllers: [AlertEventsController],
  providers: [
    AlertEventsService,
    AlertEventsRepository,
    AlertSlaPolicyRepository,
    AlertSlaResolverService,
  ],
  exports: [
    AlertEventsService,
    AlertEventsRepository,
    AlertSlaResolverService,
  ],
})
export class AlertEventsModule {}
