import { Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { AlertEventsModule } from '../../alert-events/alert-events.module';
import { DOMAIN_EVENT_PUBLISHER } from './contracts/domain-event-publisher.interface';
import { InMemoryDomainEventPublisher } from './publishers/in-memory-domain-event.publisher';
import { ChecklistRunItemFailedCreateAlertHandler } from './handlers/checklist-run-item-failed-create-alert.handler';

@Module({
  imports: [forwardRef(() => AlertEventsModule)],
  providers: [
    InMemoryDomainEventPublisher,
    ChecklistRunItemFailedCreateAlertHandler,
    {
      provide: DOMAIN_EVENT_PUBLISHER,
      useExisting: InMemoryDomainEventPublisher,
    },
  ],
  exports: [DOMAIN_EVENT_PUBLISHER],
})
export class DomainEventsModule implements OnModuleInit {
  constructor(
    private readonly publisher: InMemoryDomainEventPublisher,
    private readonly checklistRunItemFailedHandler: ChecklistRunItemFailedCreateAlertHandler,
  ) {}

  onModuleInit() {
    this.publisher.registerHandler(this.checklistRunItemFailedHandler);
  }
}
