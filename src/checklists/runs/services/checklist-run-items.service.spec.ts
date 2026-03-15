import { Test, TestingModule } from '@nestjs/testing';
import { ChecklistRunItemsService } from './checklist-run-items.service';
import { ChecklistRunItemsRepository } from '../repositories/checklist-run-items.repository';
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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChecklistRunItemsService,
        {
          provide: ChecklistRunItemsRepository,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get(ChecklistRunItemsService);
    repo = module.get(ChecklistRunItemsRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
});
