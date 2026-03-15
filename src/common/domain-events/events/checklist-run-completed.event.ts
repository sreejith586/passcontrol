import { DomainEvent } from '../contracts/domain-event.interface';

export const CHECKLIST_RUN_COMPLETED_EVENT = 'checklist.run.completed';

export interface ChecklistRunCompletedPayload {
  checklistRunId: string;
  runNumber: number;
  checklistTemplateId: string;
  templateNameSnapshot: string;
  performedByUserId: string | null;
  brandId: string | null;
  locationId: string | null;
  zoneId: string | null;
  dueAt: Date | null;
  completedAt: Date;
}

export interface ChecklistRunCompletedEvent
  extends DomainEvent<ChecklistRunCompletedPayload> {
  eventName: typeof CHECKLIST_RUN_COMPLETED_EVENT;
}

export function createChecklistRunCompletedEvent(
  organizationId: string,
  payload: ChecklistRunCompletedPayload,
): ChecklistRunCompletedEvent {
  return {
    eventName: CHECKLIST_RUN_COMPLETED_EVENT,
    occurredAt: new Date(),
    organizationId,
    payload,
  };
}
