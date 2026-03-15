import { Injectable } from '@nestjs/common';
import { DomainEventHandler } from '../contracts/domain-event-handler.interface';
import {
  CHECKLIST_RUN_ITEM_FAILED_EVENT,
  ChecklistRunItemFailedEvent,
} from '../events/checklist-run-item-failed.event';
import { AlertEventsRepository } from '../../../alert-events/repositories/alert-events.repository';
import { AlertEventStatus } from '../../../alert-events/enums/alert-status.enum';

/**
 * Creates an alert event when a checklist run item transitions to FAIL.
 * Preserves behavior previously inline in ChecklistRunsService.updateRunItem.
 */
@Injectable()
export class ChecklistRunItemFailedCreateAlertHandler
  implements DomainEventHandler<ChecklistRunItemFailedEvent>
{
  readonly eventName = CHECKLIST_RUN_ITEM_FAILED_EVENT;

  constructor(private readonly alertEventsRepo: AlertEventsRepository) {}

  async handle(event: ChecklistRunItemFailedEvent): Promise<void> {
    const { organizationId, payload } = event;

    await this.alertEventsRepo.create({
      organizationId,
      brandId: payload.brandId ?? null,
      locationId: payload.locationId ?? null,
      zoneId: payload.zoneId ?? null,
      assetId: null,
      sourceType: 'CHECKLIST_RUN_ITEM',
      sourceId: payload.checklistRunItemSnapshotId,
      type: 'CHECKLIST_ITEM_FAIL',
      status: AlertEventStatus.OPEN,
      severity: payload.severity ?? null,
      payloadJson: {
        runId: payload.checklistRunId,
        checklistRunItemSnapshotId: payload.checklistRunItemSnapshotId,
        templateNameSnapshot: payload.templateNameSnapshot,
        sectionTitle: payload.sectionTitle ?? undefined,
        label: payload.label,
        result: 'FAIL',
        comment: payload.comment ?? undefined,
        severity: payload.severity,
      },
      triggeredAt: event.occurredAt,
    });
  }
}
