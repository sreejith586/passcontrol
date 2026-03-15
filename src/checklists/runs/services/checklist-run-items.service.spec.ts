import { Test, TestingModule } from '@nestjs/testing';
import { ChecklistRunItemsService } from './checklist-run-items.service';
import { ChecklistRunItemsRepository } from '../repositories/checklist-run-items.repository';
import { AlertEventsRepository } from '../../../alert-events/repositories/alert-events.repository';
import { AlertEventsService } from '../../../alert-events/services/alert-events.service';
import { ChecklistItemSeverity } from '../../enums/checklist-item-severity.enum';

describe('ChecklistRunItemsService', () => {
  let service: ChecklistRunItemsService;
  let repo: jest.Mocked<ChecklistRunItemsRepository>;

  const mockOrgId = 'org-123';

  const mockHydratedRow = {
    id: 'item-1',
    checklistRunId: 'run-1',
    labelSnapshot: 'Check temperature',
    result: 'FAIL',
    severitySnapshot: 'CRITICAL',
    comment: 'Out of range',
    _count: { attachments: 2 },
    checklistRun: {
      runNumber: 100,
      templateNameSnapshot: 'Opening Checklist',
      dueAt: new Date('2025-03-15T10:00:00Z'),
      brandId: 'brand-1',
      locationId: 'loc-1',
      zoneId: 'zone-1',
    },
  };

  beforeEach(async () => {
    const mockRepo = {
      findFailedItemIds: jest.fn().mockResolvedValue(['item-1']),
      countFailedItems: jest.fn().mockResolvedValue(1),
      findByIdsWithRunAndAttachmentCount: jest
        .fn()
        .mockResolvedValue([mockHydratedRow]),
      findByIdWithContext: jest.fn().mockResolvedValue(null),
      findById: jest.fn().mockResolvedValue(null),
      getFailedItemsSummary: jest.fn().mockResolvedValue({
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        unknown: 0,
        affectedRuns: 0,
        openAlerts: 0,
        acknowledgedAlerts: 0,
        resolvedAlerts: 0,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChecklistRunItemsService,
        {
          provide: ChecklistRunItemsRepository,
          useValue: mockRepo,
        },
        {
          provide: AlertEventsRepository,
          useValue: { findFirstBySourceAndStatuses: jest.fn() },
        },
        {
          provide: AlertEventsService,
          useValue: { acknowledge: jest.fn(), resolve: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(ChecklistRunItemsService);
    repo = module.get(ChecklistRunItemsRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSummary', () => {
    it('returns normalized response shape with zero defaults when no data', async () => {
      repo.getFailedItemsSummary.mockResolvedValue({
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        unknown: 0,
        affectedRuns: 0,
        openAlerts: 0,
        acknowledgedAlerts: 0,
        resolvedAlerts: 0,
      });

      const result = await service.getSummary(
        { organizationId: mockOrgId },
        {},
      );

      expect(result).toEqual({
        failedItems: {
          total: 0,
          bySeverity: {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            unknown: 0,
          },
        },
        alerts: {
          open: 0,
          acknowledged: 0,
          resolved: 0,
        },
        runs: {
          affectedRuns: 0,
        },
      });
      expect(repo.getFailedItemsSummary).toHaveBeenCalledWith(
        mockOrgId,
        expect.objectContaining({
          brandId: undefined,
          locationId: undefined,
          zoneId: undefined,
          checklistTemplateId: undefined,
          severity: undefined,
          from: undefined,
          to: undefined,
        }),
      );
    });

    it('maps repository response to normalized shape', async () => {
      repo.getFailedItemsSummary.mockResolvedValue({
        total: 10,
        critical: 2,
        high: 3,
        medium: 2,
        low: 1,
        unknown: 2,
        affectedRuns: 5,
        openAlerts: 3,
        acknowledgedAlerts: 2,
        resolvedAlerts: 2,
      });

      const result = await service.getSummary(
        { organizationId: mockOrgId },
        { brandId: 'brand-1', from: '2025-03-01' },
      );

      expect(result.failedItems.total).toBe(10);
      expect(result.failedItems.bySeverity).toEqual({
        critical: 2,
        high: 3,
        medium: 2,
        low: 1,
        unknown: 2,
      });
      expect(result.alerts).toEqual({
        open: 3,
        acknowledged: 2,
        resolved: 2,
      });
      expect(result.runs.affectedRuns).toBe(5);
      expect(repo.getFailedItemsSummary).toHaveBeenCalledWith(mockOrgId, {
        brandId: 'brand-1',
        locationId: undefined,
        zoneId: undefined,
        checklistTemplateId: undefined,
        severity: undefined,
        from: '2025-03-01',
        to: undefined,
      });
    });
  });

  describe('getFailedItems', () => {
    it('passes filters and pagination to repository', async () => {
      const query = {
        brandId: 'brand-1',
        locationId: 'loc-1',
        zoneId: 'zone-1',
        checklistTemplateId: 'tpl-1',
        severity: ChecklistItemSeverity.CRITICAL,
        from: '2025-03-01',
        to: '2025-03-15',
        page: 2,
        limit: 50,
      };

      await service.getFailedItems({ organizationId: mockOrgId }, query);

      expect(repo.findFailedItemIds).toHaveBeenCalledWith(
        mockOrgId,
        {
          brandId: 'brand-1',
          locationId: 'loc-1',
          zoneId: 'zone-1',
          checklistTemplateId: 'tpl-1',
          severity: 'CRITICAL',
          from: '2025-03-01',
          to: '2025-03-15',
        },
        { page: 2, limit: 50 },
      );
      expect(repo.countFailedItems).toHaveBeenCalledWith(mockOrgId, {
        brandId: 'brand-1',
        locationId: 'loc-1',
        zoneId: 'zone-1',
        checklistTemplateId: 'tpl-1',
        severity: 'CRITICAL',
        from: '2025-03-01',
        to: '2025-03-15',
      });
    });

    it('uses default page 1 and limit 25 when not provided', async () => {
      await service.getFailedItems({ organizationId: mockOrgId }, {});

      expect(repo.findFailedItemIds).toHaveBeenCalledWith(
        mockOrgId,
        expect.any(Object),
        { page: 1, limit: 25 },
      );
    });

    it('caps limit at 100', async () => {
      await service.getFailedItems(
        { organizationId: mockOrgId },
        { limit: 200 },
      );

      expect(repo.findFailedItemIds).toHaveBeenCalledWith(
        mockOrgId,
        expect.any(Object),
        { page: 1, limit: 100 },
      );
    });

    it('returns correct response shape with label and attachmentCount', async () => {
      const result = await service.getFailedItems(
        { organizationId: mockOrgId },
        {},
      );

      expect(result).toEqual({
        items: [
          {
            id: 'item-1',
            checklistRunId: 'run-1',
            label: 'Check temperature',
            result: 'FAIL',
            severitySnapshot: 'CRITICAL',
            comment: 'Out of range',
            attachmentCount: 2,
            checklistRun: {
              runNumber: 100,
              templateNameSnapshot: 'Opening Checklist',
              dueAt: new Date('2025-03-15T10:00:00Z'),
              brandId: 'brand-1',
              locationId: 'loc-1',
              zoneId: 'zone-1',
            },
          },
        ],
        total: 1,
        page: 1,
        limit: 25,
      });
    });

    it('preserves order of ids from repository', async () => {
      repo.findFailedItemIds.mockResolvedValue(['item-2', 'item-1']);
      repo.findByIdsWithRunAndAttachmentCount.mockResolvedValue([
        { ...mockHydratedRow, id: 'item-2', labelSnapshot: 'Second' },
        { ...mockHydratedRow, id: 'item-1', labelSnapshot: 'First' },
      ]);

      const result = await service.getFailedItems(
        { organizationId: mockOrgId },
        {},
      );

      expect(result.items[0].id).toBe('item-2');
      expect(result.items[0].label).toBe('Second');
      expect(result.items[1].id).toBe('item-1');
      expect(result.items[1].label).toBe('First');
    });

    it('returns empty items when no ids returned', async () => {
      repo.findFailedItemIds.mockResolvedValue([]);
      repo.findByIdsWithRunAndAttachmentCount.mockResolvedValue([]);

      const result = await service.getFailedItems(
        { organizationId: mockOrgId },
        {},
      );

      expect(result.items).toEqual([]);
      expect(result.total).toBe(1);
    });
  });

  describe('getById', () => {
    it('throws NotFoundException when item not found', async () => {
      repo.findByIdWithContext.mockResolvedValue(null);

      await expect(
        service.getById({ organizationId: mockOrgId }, 'item-1'),
      ).rejects.toThrow('Checklist run item snapshot not found');
    });

    it('returns mapped item with full context', async () => {
      const mockRow = {
        id: 'item-1',
        checklistRunId: 'run-1',
        labelSnapshot: 'Check temperature',
        helpTextSnapshot: 'Use thermometer',
        itemTypeSnapshot: 'TEMPERATURE',
        result: 'FAIL',
        comment: 'Out of range',
        sortOrder: 1,
        requiresEvidenceOnFailSnapshot: true,
        requiresCommentOnFailSnapshot: true,
        severitySnapshot: 'CRITICAL',
        checklistRunSectionSnapshot: {
          id: 'sec-1',
          titleSnapshot: 'Opening',
          sortOrder: 1,
        },
        checklistRun: {
          id: 'run-1',
          runNumber: 100,
          status: 'COMPLETED',
          templateNameSnapshot: 'Daily',
          dueAt: new Date('2025-03-15T10:00:00Z'),
          startedAt: new Date('2025-03-15T10:05:00Z'),
          completedAt: new Date('2025-03-15T10:30:00Z'),
          brandId: 'brand-1',
          locationId: 'loc-1',
          zoneId: 'zone-1',
          performedByUserId: 'user-1',
        },
        attachments: [
          {
            id: 'att-1',
            fileId: 'file-1',
            createdAt: new Date(),
            file: { fileName: 'photo.jpg', mimeType: 'image/jpeg' },
          },
        ],
        temperatureReadings: [
          {
            id: 'tr-1',
            readingValue: 45,
            unit: 'C',
            recordedAt: new Date(),
            isBreach: true,
            breachType: 'HIGH',
            sourceType: 'MANUAL',
          },
        ],
        alertEvent: {
          id: 'alert-1',
          status: 'OPEN',
          severity: 'CRITICAL',
          acknowledgedAt: null,
          acknowledgedByUserId: null,
          resolvedAt: null,
          resolvedByUserId: null,
          resolutionNote: null,
          createdAt: new Date(),
        },
      };
      repo.findByIdWithContext.mockResolvedValue(mockRow as never);

      const result = await service.getById(
        { organizationId: mockOrgId },
        'item-1',
      );

      expect(result.label).toBe('Check temperature');
      expect(result.description).toBe('Use thermometer');
      expect(result.itemType).toBe('TEMPERATURE');
      expect(result.sectionSnapshot.title).toBe('Opening');
      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0].fileName).toBe('photo.jpg');
      expect(result.temperatureReadings).toHaveLength(1);
      expect(result.alertEvent).not.toBeNull();
      expect(result.alertEvent!.status).toBe('OPEN');
    });

    it('returns alertEvent null when no related alert', async () => {
      const mockRow = {
        id: 'item-1',
        checklistRunId: 'run-1',
        labelSnapshot: 'Check',
        helpTextSnapshot: null,
        itemTypeSnapshot: 'CHECKBOX',
        result: 'FAIL',
        comment: null,
        sortOrder: 1,
        requiresEvidenceOnFailSnapshot: false,
        requiresCommentOnFailSnapshot: false,
        severitySnapshot: 'MEDIUM',
        checklistRunSectionSnapshot: {
          id: 'sec-1',
          titleSnapshot: 'Section',
          sortOrder: 1,
        },
        checklistRun: {
          id: 'run-1',
          runNumber: 1,
          status: 'PENDING',
          templateNameSnapshot: 'Daily',
          dueAt: null,
          startedAt: null,
          completedAt: null,
          brandId: null,
          locationId: null,
          zoneId: null,
          performedByUserId: null,
        },
        attachments: [],
        temperatureReadings: [],
        alertEvent: null,
      };
      repo.findByIdWithContext.mockResolvedValue(mockRow as never);

      const result = await service.getById(
        { organizationId: mockOrgId },
        'item-1',
      );

      expect(result.alertEvent).toBeNull();
    });
  });
});
