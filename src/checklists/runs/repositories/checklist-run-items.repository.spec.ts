import { Test, TestingModule } from '@nestjs/testing';
import { ChecklistRunItemsRepository } from './checklist-run-items.repository';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { AlertEventsRepository } from '../../../alert-events/repositories/alert-events.repository';

describe('ChecklistRunItemsRepository', () => {
  let repo: ChecklistRunItemsRepository;
  let prisma: {
    $queryRaw: jest.Mock;
    checklistRunItemSnapshot: { findMany: jest.Mock; findFirst: jest.Mock };
    temperatureReading: { findMany: jest.Mock };
  };

  const mockOrgId = 'org-123';

  let mockAlertEventsRepo: { findFirstBySource: jest.Mock };

  beforeEach(async () => {
    mockAlertEventsRepo = {
      findFirstBySource: jest.fn().mockResolvedValue(null),
    };
    prisma = {
      $queryRaw: jest.fn(),
      checklistRunItemSnapshot: { findMany: jest.fn(), findFirst: jest.fn() },
      temperatureReading: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChecklistRunItemsRepository,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: AlertEventsRepository,
          useValue: mockAlertEventsRepo,
        },
      ],
    }).compile();

    repo = module.get(ChecklistRunItemsRepository);
  });

  it('should be defined', () => {
    expect(repo).toBeDefined();
  });

  describe('findFailedItemIds', () => {
    it('returns ids from raw query and applies pagination', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { id: 'item-1' },
        { id: 'item-2' },
      ]);

      const result = await repo.findFailedItemIds(
        mockOrgId,
        {},
        { page: 1, limit: 25 },
      );

      expect(result).toEqual(['item-1', 'item-2']);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('calls $queryRaw with filters', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await repo.findFailedItemIds(
        mockOrgId,
        { brandId: 'brand-1', severity: 'CRITICAL' },
        { page: 2, limit: 10 },
      );

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe('countFailedItems', () => {
    it('returns count from raw query', async () => {
      prisma.$queryRaw.mockResolvedValue([{ count: BigInt(42) }]);

      const result = await repo.countFailedItems(mockOrgId, {});

      expect(result).toBe(42);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('returns 0 when no rows', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await repo.countFailedItems(mockOrgId, {});

      expect(result).toBe(0);
    });
  });

  describe('findByIdsWithRunAndAttachmentCount', () => {
    it('returns hydrated items in id order and reorders by input ids', async () => {
      const mockItem1 = {
        id: 'item-1',
        checklistRunId: 'run-1',
        labelSnapshot: 'First',
        result: 'FAIL',
        severitySnapshot: 'HIGH',
        comment: null,
        _count: { attachments: 1 },
        checklistRun: {
          runNumber: 100,
          templateNameSnapshot: 'Checklist',
          dueAt: new Date(),
          brandId: null,
          locationId: null,
          zoneId: null,
        },
      };
      const mockItem2 = { ...mockItem1, id: 'item-2', labelSnapshot: 'Second' };

      prisma.checklistRunItemSnapshot.findMany.mockResolvedValue([
        mockItem2,
        mockItem1,
      ]);

      const result = await repo.findByIdsWithRunAndAttachmentCount(mockOrgId, [
        'item-1',
        'item-2',
      ]);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('item-1');
      expect(result[0].labelSnapshot).toBe('First');
      expect(result[1].id).toBe('item-2');
      expect(result[1].labelSnapshot).toBe('Second');
    });

    it('returns empty array when ids is empty', async () => {
      const result = await repo.findByIdsWithRunAndAttachmentCount(
        mockOrgId,
        [],
      );

      expect(result).toEqual([]);
      expect(prisma.checklistRunItemSnapshot.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('returns item id when found within organization', async () => {
      prisma.checklistRunItemSnapshot.findFirst.mockResolvedValue({
        id: 'item-1',
      });

      const result = await repo.findById(mockOrgId, 'item-1');

      expect(result).toEqual({ id: 'item-1' });
      expect(prisma.checklistRunItemSnapshot.findFirst).toHaveBeenCalledWith({
        where: { id: 'item-1', organizationId: mockOrgId },
        select: { id: true },
      });
    });

    it('returns null when item not found', async () => {
      prisma.checklistRunItemSnapshot.findFirst.mockResolvedValue(null);

      const result = await repo.findById(mockOrgId, 'item-1');

      expect(result).toBeNull();
    });
  });

  describe('findByIdWithContext', () => {
    it('returns null when item not found', async () => {
      prisma.checklistRunItemSnapshot.findFirst.mockResolvedValue(null);

      const result = await repo.findByIdWithContext(mockOrgId, 'item-1');

      expect(result).toBeNull();
      expect(mockAlertEventsRepo.findFirstBySource).not.toHaveBeenCalled();
    });

    it('returns item with attachments, temperature readings, and alert', async () => {
      const mockItem = {
        id: 'item-1',
        checklistRunId: 'run-1',
        labelSnapshot: 'Check temp',
        helpTextSnapshot: 'Use thermometer',
        itemTypeSnapshot: 'TEMPERATURE',
        result: 'FAIL',
        comment: 'Out of range',
        sortOrder: 1,
        requiresEvidenceOnFailSnapshot: true,
        requiresCommentOnFailSnapshot: true,
        severitySnapshot: 'HIGH',
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
          dueAt: new Date(),
          startedAt: new Date(),
          completedAt: new Date(),
          brandId: 'b1',
          locationId: 'l1',
          zoneId: 'z1',
          performedByUserId: 'u1',
        },
        attachments: [
          {
            id: 'att-1',
            fileId: 'f1',
            createdAt: new Date(),
            file: { fileName: 'photo.jpg', mimeType: 'image/jpeg' },
          },
        ],
      };
      prisma.checklistRunItemSnapshot.findFirst.mockResolvedValue(mockItem);
      prisma.temperatureReading.findMany.mockResolvedValue([
        {
          id: 'tr-1',
          readingValue: 45,
          unit: 'C',
          recordedAt: new Date(),
          isBreach: true,
          breachType: 'HIGH',
          sourceType: 'MANUAL',
        },
      ]);
      mockAlertEventsRepo.findFirstBySource.mockResolvedValue({
        id: 'alert-1',
        status: 'OPEN',
        severity: 'HIGH',
        acknowledgedAt: null,
        acknowledgedByUserId: null,
        resolvedAt: null,
        resolvedByUserId: null,
        resolutionNote: null,
        createdAt: new Date(),
      });

      const result = await repo.findByIdWithContext(mockOrgId, 'item-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('item-1');
      expect(result!.attachments).toHaveLength(1);
      expect(result!.temperatureReadings).toHaveLength(1);
      expect(result!.alertEvent).not.toBeNull();
      expect(mockAlertEventsRepo.findFirstBySource).toHaveBeenCalledWith(
        mockOrgId,
        'CHECKLIST_RUN_ITEM',
        'item-1',
      );
    });
  });
});
