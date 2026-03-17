import { Injectable } from '@nestjs/common';
import { DomainEventHandler } from '../contracts/domain-event-handler.interface';
import {
  CHECKLIST_RUN_ITEM_FAILED_EVENT,
  ChecklistRunItemFailedEvent,
} from '../events/checklist-run-item-failed.event';
import { AlertEventsService } from '../../../alert-events/services/alert-events.service';

/**
 * Creates an alert event when a checklist run item transitions to FAIL.
 * Delegates to AlertEventsService which owns SLA resolution and snapshotting.
 */
@Injectable()
export class ChecklistRunItemFailedCreateAlertHandler
  implements DomainEventHandler<ChecklistRunItemFailedEvent>
{
  readonly eventName = CHECKLIST_RUN_ITEM_FAILED_EVENT;

  constructor(private readonly alertEventsService: AlertEventsService) {}

  async handle(event: ChecklistRunItemFailedEvent): Promise<void> {
    const { organizationId, payload } = event;

    await this.alertEventsService.createFromPayload({
      organizationId,
      sourceType: 'CHECKLIST_RUN_ITEM',
      sourceId: payload.checklistRunItemSnapshotId,
      type: 'CHECKLIST_ITEM_FAIL',
      scope: {
        brandId: payload.brandId ?? undefined,
        locationId: payload.locationId ?? undefined,
        zoneId: payload.zoneId ?? undefined,
      },
      payload: {
        runId: payload.checklistRunId,
        checklistRunItemSnapshotId: payload.checklistRunItemSnapshotId,
        templateNameSnapshot: payload.templateNameSnapshot,
        sectionTitle: payload.sectionTitle ?? undefined,
        label: payload.label,
        result: 'FAIL',
        comment: payload.comment ?? undefined,
        severity: payload.severity,
      },
      severity: payload.severity ?? undefined,
      triggeredAt: event.occurredAt,
    });
  }
}
