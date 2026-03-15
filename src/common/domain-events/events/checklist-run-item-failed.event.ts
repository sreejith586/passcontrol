import { DomainEvent } from '../contracts/domain-event.interface';

export const CHECKLIST_RUN_ITEM_FAILED_EVENT = 'checklist.run-item.failed';

export interface ChecklistRunItemFailedPayload {
  checklistRunItemSnapshotId: string;
  checklistRunId: string;
  checklistTemplateId: string;
  runNumber: number;
  label: string;
  severity: string;
  comment: string | null;
  brandId: string | null;
  locationId: string | null;
  zoneId: string | null;
  dueAt: Date | null;
  templateNameSnapshot: string;
  sectionTitle: string | null;
}

export interface ChecklistRunItemFailedEvent
  extends DomainEvent<ChecklistRunItemFailedPayload> {
  eventName: typeof CHECKLIST_RUN_ITEM_FAILED_EVENT;
}

export function createChecklistRunItemFailedEvent(
  organizationId: string,
  payload: ChecklistRunItemFailedPayload,
): ChecklistRunItemFailedEvent {
  return {
    eventName: CHECKLIST_RUN_ITEM_FAILED_EVENT,
    occurredAt: new Date(),
    organizationId,
    payload,
  };
}
