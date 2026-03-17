import { Test, TestingModule } from '@nestjs/testing';
import { ChecklistRunsService } from './checklist-runs.service';
import { ChecklistRunsRepository } from '../repositories/checklist-runs.repository';
import { AuditLogsService } from '../../../audit/services/audit-logs.service';
import { AlertEventsService } from '../../../alert-events/services/alert-events.service';
import { AttachmentsService } from '../../../attachments/services/attachments.service';
import { TemperatureReadingsService } from '../../../temperature/services/temperature-readings.service';
import {
  DOMAIN_EVENT_PUBLISHER,
  DomainEventPublisher,
} from '../../../common/domain-events/contracts/domain-event-publisher.interface';
import { InMemoryDomainEventPublisher } from '../../../common/domain-events/publishers/in-memory-domain-event.publisher';
import { ChecklistRunItemFailedCreateAlertHandler } from '../../../common/domain-events/handlers/checklist-run-item-failed-create-alert.handler';
import { CHECKLIST_RUN_COMPLETED_EVENT } from '../../../common/domain-events/events/checklist-run-completed.event';

describe('ChecklistRunsService (domain events - fail transition)', () => {
  let service: ChecklistRunsService;
  let repo: jest.Mocked<ChecklistRunsRepository>;
  let alertEventsService: jest.Mocked<AlertEventsService>;
  let publisher: InMemoryDomainEventPublisher;

  const mockOrgId = 'org-1';
  const mockItemId = 'item-1';
  const mockRun = {
    id: 'run-1',
    organizationId: mockOrgId,
    checklistTemplateId: 'tpl-1',
    runNumber: 100,
    templateNameSnapshot: 'Daily Checklist',
    dueAt: new Date('2025-03-15T10:00:00Z'),
    brandId: 'brand-1',
    locationId: 'loc-1',
    zoneId: 'zone-1',
    status: 'IN_PROGRESS',
  };
  const mockSection = {
    id: 'sec-1',
    titleSnapshot: 'Opening',
  };

  const createMockItem = (result: string | null) => ({
    id: mockItemId,
    organizationId: mockOrgId,
    checklistRunId: mockRun.id,
    result,
    labelSnapshot: 'Check temperature',
    severitySnapshot: 'CRITICAL' as const,
    comment: 'Out of range',
    checklistRun: mockRun,
    checklistRunSectionSnapshot: mockSection,
  });

  beforeEach(async () => {
    alertEventsService = {
      createFromPayload: jest.fn().mockResolvedValue({ id: 'alert-1' }),
    } as unknown as jest.Mocked<AlertEventsService>;

    const mockRepo = {
      findRunItemById: jest.fn(),
      updateRunItem: jest.fn(),
      markRunInProgress: jest.fn(),
    };

    publisher = new InMemoryDomainEventPublisher();
    const handler = new ChecklistRunItemFailedCreateAlertHandler(
      alertEventsService,
    );
    publisher.registerHandler(handler);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChecklistRunsService,
        { provide: ChecklistRunsRepository, useValue: mockRepo },
        { provide: AuditLogsService, useValue: { recordWrite: jest.fn() } },
        { provide: AlertEventsService, useValue: {} },
        { provide: DOMAIN_EVENT_PUBLISHER, useValue: publisher },
        { provide: AttachmentsService, useValue: {} },
        { provide: TemperatureReadingsService, useValue: {} },
      ],
    }).compile();

    service = module.get(ChecklistRunsService);
    repo = module.get(ChecklistRunsRepository);
  });

  it('publishes checklist.run-item.failed and creates alert when NOT FAIL -> FAIL', async () => {
    const itemBefore = createMockItem('PASS');
    const itemAfter = createMockItem('FAIL');

    repo.findRunItemById
      .mockResolvedValueOnce(itemBefore as never)
      .mockResolvedValueOnce(itemAfter as never);
    repo.updateRunItem.mockResolvedValue(itemAfter as never);

    await service.updateRunItem(
      { organizationId: mockOrgId, userId: 'user-1' },
      mockItemId,
      { result: 'FAIL' },
    );

    expect(alertEventsService.createFromPayload).toHaveBeenCalledTimes(1);
    const createCall = alertEventsService.createFromPayload.mock.calls[0][0];
    expect(createCall.sourceType).toBe('CHECKLIST_RUN_ITEM');
    expect(createCall.sourceId).toBe(mockItemId);
    expect(createCall.type).toBe('CHECKLIST_ITEM_FAIL');
    expect(createCall.organizationId).toBe(mockOrgId);
    expect(createCall.severity).toBe('CRITICAL');
  });

  it('does NOT create alert when result remains FAIL -> FAIL', async () => {
    const itemBefore = createMockItem('FAIL');
    const itemAfter = createMockItem('FAIL');

    repo.findRunItemById
      .mockResolvedValueOnce(itemBefore as never)
      .mockResolvedValueOnce(itemAfter as never);
    repo.updateRunItem.mockResolvedValue(itemAfter as never);

    await service.updateRunItem(
      { organizationId: mockOrgId, userId: 'user-1' },
      mockItemId,
      { comment: 'Updated comment' },
    );

    expect(alertEventsService.createFromPayload).not.toHaveBeenCalled();
  });

  it('does NOT create alert when result is PASS', async () => {
    const itemBefore = createMockItem('PASS');
    const itemAfter = createMockItem('PASS');

    repo.findRunItemById
      .mockResolvedValueOnce(itemBefore as never)
      .mockResolvedValueOnce(itemAfter as never);
    repo.updateRunItem.mockResolvedValue(itemAfter as never);

    await service.updateRunItem(
      { organizationId: mockOrgId, userId: 'user-1' },
      mockItemId,
      { result: 'PASS' },
    );

    expect(alertEventsService.createFromPayload).not.toHaveBeenCalled();
  });

  it('does NOT create alert when result is empty string (no transition to FAIL)', async () => {
    const itemBefore = createMockItem(null);
    const itemAfter = { ...createMockItem('PASS'), result: 'PASS' as const };

    repo.findRunItemById
      .mockResolvedValueOnce(itemBefore as never)
      .mockResolvedValueOnce(itemAfter as never);
    repo.updateRunItem.mockResolvedValue(itemAfter as never);

    await service.updateRunItem(
      { organizationId: mockOrgId, userId: 'user-1' },
      mockItemId,
      { result: 'PASS' },
    );

    expect(alertEventsService.createFromPayload).not.toHaveBeenCalled();
  });

  it('propagates handler failure (fail-fast)', async () => {
    const itemBefore = createMockItem('PASS');
    const itemAfter = createMockItem('FAIL');

    repo.findRunItemById
      .mockResolvedValueOnce(itemBefore as never)
      .mockResolvedValueOnce(itemAfter as never);
    repo.updateRunItem.mockResolvedValue(itemAfter as never);

    alertEventsService.createFromPayload.mockRejectedValueOnce(new Error('DB error'));

    await expect(
      service.updateRunItem(
        { organizationId: mockOrgId, userId: 'user-1' },
        mockItemId,
        { result: 'FAIL' },
      ),
    ).rejects.toThrow('DB error');
  });
});

describe('ChecklistRunsService (domain events - run completion)', () => {
  let service: ChecklistRunsService;
  let repo: jest.Mocked<ChecklistRunsRepository>;
  let publisher: { publish: jest.Mock; publishedEvents: unknown[] };

  const mockOrgId = 'org-1';
  const mockRunId = 'run-1';

  const createMockRun = (overrides: Partial<{
    id: string;
    status: string;
    runNumber: number;
    checklistTemplateId: string;
    templateNameSnapshot: string;
    performedByUserId: string | null;
    brandId: string | null;
    locationId: string | null;
    zoneId: string | null;
    dueAt: Date | null;
    completedAt: Date | null;
  }> = {}) => ({
    id: mockRunId,
    organizationId: mockOrgId,
    status: 'IN_PROGRESS',
    runNumber: 100,
    checklistTemplateId: 'tpl-1',
    templateNameSnapshot: 'Daily Checklist',
    performedByUserId: null,
    brandId: 'brand-1',
    locationId: 'loc-1',
    zoneId: 'zone-1',
    dueAt: new Date('2025-03-15T10:00:00Z'),
    completedAt: null,
    ...overrides,
  });

  beforeEach(async () => {
    publisher = {
      publish: jest.fn().mockImplementation(async (event: unknown) => {
        publisher.publishedEvents.push(event);
      }),
      publishedEvents: [],
    };

    const mockRepo = {
      findRunById: jest.fn(),
      listRequiredUnansweredItems: jest.fn(),
      listFailedItemsWithComplianceRequirements: jest.fn(),
      submitRun: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        ChecklistRunsService,
        { provide: ChecklistRunsRepository, useValue: mockRepo },
        { provide: AuditLogsService, useValue: { recordWrite: jest.fn() } },
        { provide: AlertEventsService, useValue: {} },
        { provide: DOMAIN_EVENT_PUBLISHER, useValue: publisher },
        { provide: AttachmentsService, useValue: {} },
        { provide: TemperatureReadingsService, useValue: {} },
      ],
    }).compile();

    service = module.get(ChecklistRunsService);
    repo = module.get(ChecklistRunsRepository);
  });

  it('publishes checklist.run.completed with correct payload after successful submit', async () => {
    const runBefore = createMockRun({ status: 'IN_PROGRESS' });
    const completedAt = new Date('2025-03-15T14:30:00Z');
    const submitted = createMockRun({
      status: 'COMPLETED',
      performedByUserId: 'user-1',
      completedAt,
    });

    repo.findRunById.mockResolvedValue(runBefore as never);
    repo.listRequiredUnansweredItems.mockResolvedValue([]);
    repo.listFailedItemsWithComplianceRequirements.mockResolvedValue([]);
    repo.submitRun.mockResolvedValue(submitted as never);

    await service.submitRun(
      { organizationId: mockOrgId, userId: 'user-1' },
      mockRunId,
    );

    expect(publisher.publish).toHaveBeenCalledTimes(1);
    const event = publisher.publishedEvents[0] as {
      eventName: string;
      organizationId: string;
      payload: Record<string, unknown>;
    };
    expect(event.eventName).toBe(CHECKLIST_RUN_COMPLETED_EVENT);
    expect(event.organizationId).toBe(mockOrgId);
    expect(event.payload).toMatchObject({
      checklistRunId: mockRunId,
      runNumber: 100,
      checklistTemplateId: 'tpl-1',
      templateNameSnapshot: 'Daily Checklist',
      performedByUserId: 'user-1',
      brandId: 'brand-1',
      locationId: 'loc-1',
      zoneId: 'zone-1',
      dueAt: new Date('2025-03-15T10:00:00Z'),
    });
    expect(event.payload.completedAt).toEqual(completedAt);
  });

  it('does NOT publish when submit fails (run already completed)', async () => {
    const runBefore = createMockRun({ status: 'COMPLETED' });
    repo.findRunById.mockResolvedValue(runBefore as never);

    await expect(
      service.submitRun(
        { organizationId: mockOrgId, userId: 'user-1' },
        mockRunId,
      ),
    ).rejects.toThrow('Run is already completed');

    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it('does NOT publish when submit fails (unanswered required items)', async () => {
    const runBefore = createMockRun({ status: 'IN_PROGRESS' });
    repo.findRunById.mockResolvedValue(runBefore as never);
    repo.listRequiredUnansweredItems.mockResolvedValue([
      { id: 'item-1', labelSnapshot: 'Check temp' },
    ]);

    await expect(
      service.submitRun(
        { organizationId: mockOrgId, userId: 'user-1' },
        mockRunId,
      ),
    ).rejects.toThrow('Cannot submit');

    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it('does NOT publish when repo.submitRun returns null', async () => {
    const runBefore = createMockRun({ status: 'IN_PROGRESS' });
    repo.findRunById.mockResolvedValue(runBefore as never);
    repo.listRequiredUnansweredItems.mockResolvedValue([]);
    repo.listFailedItemsWithComplianceRequirements.mockResolvedValue([]);
    repo.submitRun.mockResolvedValue(null as never);

    await service.submitRun(
      { organizationId: mockOrgId, userId: 'user-1' },
      mockRunId,
    );

    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it('propagates publisher failure (fail-fast)', async () => {
    const runBefore = createMockRun({ status: 'IN_PROGRESS' });
    const submitted = createMockRun({
      status: 'COMPLETED',
      performedByUserId: 'user-1',
      completedAt: new Date(),
    });

    repo.findRunById.mockResolvedValue(runBefore as never);
    repo.listRequiredUnansweredItems.mockResolvedValue([]);
    repo.listFailedItemsWithComplianceRequirements.mockResolvedValue([]);
    repo.submitRun.mockResolvedValue(submitted as never);
    publisher.publish.mockRejectedValueOnce(new Error('Publisher error'));

    await expect(
      service.submitRun(
        { organizationId: mockOrgId, userId: 'user-1' },
        mockRunId,
      ),
    ).rejects.toThrow('Publisher error');
  });
});
