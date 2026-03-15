import { Test, TestingModule } from '@nestjs/testing';
import { ChecklistRunItemsRepository } from './checklist-run-items.repository';
import { PrismaService } from '../../../infra/prisma/prisma.service';

describe('ChecklistRunItemsRepository', () => {
  let repo: ChecklistRunItemsRepository;
  let prisma: {
    $queryRaw: jest.Mock;
    checklistRunItemSnapshot: { findMany: jest.Mock };
  };

  const mockOrgId = 'org-123';

  beforeEach(async () => {
    prisma = {
      $queryRaw: jest.fn(),
      checklistRunItemSnapshot: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChecklistRunItemsRepository,
        {
          provide: PrismaService,
          useValue: prisma,
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
});
