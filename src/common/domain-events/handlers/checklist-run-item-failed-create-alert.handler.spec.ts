import { Test, TestingModule } from '@nestjs/testing';
import { ChecklistRunItemFailedCreateAlertHandler } from './checklist-run-item-failed-create-alert.handler';
import { AlertEventsRepository } from '../../../alert-events/repositories/alert-events.repository';
import {
  CHECKLIST_RUN_ITEM_FAILED_EVENT,
  createChecklistRunItemFailedEvent,
} from '../events/checklist-run-item-failed.event';

describe('ChecklistRunItemFailedCreateAlertHandler', () => {
  let handler: ChecklistRunItemFailedCreateAlertHandler;
  let alertRepo: jest.Mocked<AlertEventsRepository>;

  beforeEach(async () => {
    const mockAlertRepo = {
      create: jest.fn().mockResolvedValue({ id: 'alert-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChecklistRunItemFailedCreateAlertHandler,
        {
          provide: AlertEventsRepository,
          useValue: mockAlertRepo,
        },
      ],
    }).compile();

    handler = module.get(ChecklistRunItemFailedCreateAlertHandler);
    alertRepo = module.get(AlertEventsRepository);
  });

  it('has correct eventName', () => {
    expect(handler.eventName).toBe(CHECKLIST_RUN_ITEM_FAILED_EVENT);
  });

  it('creates alert with correct sourceType and sourceId', async () => {
    const event = createChecklistRunItemFailedEvent('org-1', {
      checklistRunItemSnapshotId: 'item-1',
      checklistRunId: 'run-1',
      checklistTemplateId: 'tpl-1',
      runNumber: 100,
      label: 'Check temp',
      severity: 'CRITICAL',
      comment: 'Out of range',
      brandId: 'brand-1',
      locationId: 'loc-1',
      zoneId: 'zone-1',
      dueAt: new Date('2025-03-15T10:00:00Z'),
      templateNameSnapshot: 'Daily Checklist',
      sectionTitle: 'Opening',
    });

    await handler.handle(event);

    expect(alertRepo.create).toHaveBeenCalledTimes(1);
    const call = alertRepo.create.mock.calls[0][0];
    expect(call.organizationId).toBe('org-1');
    expect(call.sourceType).toBe('CHECKLIST_RUN_ITEM');
    expect(call.sourceId).toBe('item-1');
    expect(call.type).toBe('CHECKLIST_ITEM_FAIL');
    expect(call.severity).toBe('CRITICAL');
    expect(call.brandId).toBe('brand-1');
    expect(call.locationId).toBe('loc-1');
    expect(call.zoneId).toBe('zone-1');
    expect(call.payloadJson).toEqual({
      runId: 'run-1',
      checklistRunItemSnapshotId: 'item-1',
      templateNameSnapshot: 'Daily Checklist',
      sectionTitle: 'Opening',
      label: 'Check temp',
      result: 'FAIL',
      comment: 'Out of range',
      severity: 'CRITICAL',
    });
  });

  it('handles null optional fields', async () => {
    const event = createChecklistRunItemFailedEvent('org-1', {
      checklistRunItemSnapshotId: 'item-1',
      checklistRunId: 'run-1',
      checklistTemplateId: 'tpl-1',
      runNumber: 1,
      label: 'Check',
      severity: 'MEDIUM',
      comment: null,
      brandId: null,
      locationId: null,
      zoneId: null,
      dueAt: null,
      templateNameSnapshot: 'Checklist',
      sectionTitle: null,
    });

    await handler.handle(event);

    const call = alertRepo.create.mock.calls[0][0];
    expect(call.brandId).toBeNull();
    expect(call.locationId).toBeNull();
    expect(call.zoneId).toBeNull();
    expect(call.payloadJson).toMatchObject({
      comment: undefined,
      sectionTitle: undefined,
    });
  });
});
