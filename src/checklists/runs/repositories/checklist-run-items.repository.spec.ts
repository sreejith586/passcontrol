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

  describe('getFailedItemsSummary', () => {
    it('returns zero/default response when no rows', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          total: BigInt(0),
          critical: BigInt(0),
          high: BigInt(0),
          medium: BigInt(0),
          low: BigInt(0),
          unknown: BigInt(0),
          affected_runs: BigInt(0),
          open_alerts: BigInt(0),
          acknowledged_alerts: BigInt(0),
          resolved_alerts: BigInt(0),
        },
      ]);

      const result = await repo.getFailedItemsSummary(mockOrgId, {});

      expect(result).toEqual({
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
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('returns severity counts and affected runs correctly', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          total: BigInt(10),
          critical: BigInt(2),
          high: BigInt(3),
          medium: BigInt(2),
          low: BigInt(1),
          unknown: BigInt(2),
          affected_runs: BigInt(5),
          open_alerts: BigInt(3),
          acknowledged_alerts: BigInt(2),
          resolved_alerts: BigInt(2),
        },
      ]);

      const result = await repo.getFailedItemsSummary(mockOrgId, {});

      expect(result.total).toBe(10);
      expect(result.critical).toBe(2);
      expect(result.high).toBe(3);
      expect(result.medium).toBe(2);
      expect(result.low).toBe(1);
      expect(result.unknown).toBe(2);
      expect(result.affectedRuns).toBe(5);
      expect(result.openAlerts).toBe(3);
      expect(result.acknowledgedAlerts).toBe(2);
      expect(result.resolvedAlerts).toBe(2);
    });

    it('passes filters to query', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          total: BigInt(0),
          critical: BigInt(0),
          high: BigInt(0),
          medium: BigInt(0),
          low: BigInt(0),
          unknown: BigInt(0),
          affected_runs: BigInt(0),
          open_alerts: BigInt(0),
          acknowledged_alerts: BigInt(0),
          resolved_alerts: BigInt(0),
        },
      ]);

      await repo.getFailedItemsSummary(mockOrgId, {
        brandId: 'brand-1',
        locationId: 'loc-1',
        checklistTemplateId: 'tpl-1',
        severity: 'CRITICAL',
        from: '2025-03-01',
        to: '2025-03-15',
      });

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      const call = prisma.$queryRaw.mock.calls[0][0];
      const queryStr = call.strings.join('');
      expect(queryStr).toContain('filtered_failed_items');
      expect(queryStr).toContain('latest_alerts');
      expect(queryStr).toContain('DISTINCT ON');
      expect(queryStr).toContain('source_type');
      expect(queryStr).toContain('CHECKLIST_RUN_ITEM');
    });

    it('scopes query by organizationId for tenant isolation', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          total: BigInt(0),
          critical: BigInt(0),
          high: BigInt(0),
          medium: BigInt(0),
          low: BigInt(0),
          unknown: BigInt(0),
          affected_runs: BigInt(0),
          open_alerts: BigInt(0),
          acknowledged_alerts: BigInt(0),
          resolved_alerts: BigInt(0),
        },
      ]);

      await repo.getFailedItemsSummary('org-tenant-1', {});

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      const sqlArg = prisma.$queryRaw.mock.calls[0][0];
      const fullQuery = Array.isArray(sqlArg?.strings)
        ? sqlArg.strings.join(' ')
        : String(sqlArg);
      expect(fullQuery).toMatch(/organization_id|organization\.id/i);
    });
  });

  describe('getFailedItemsSummaryByLocation', () => {
    it('returns empty items when no failed items', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await repo.getFailedItemsSummaryByLocation(mockOrgId, {});

      expect(result).toEqual([]);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('groups correctly by locationId', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          location_id: 'loc-1',
          total: BigInt(5),
          critical: BigInt(2),
          high: BigInt(1),
          medium: BigInt(1),
          low: BigInt(1),
          unknown: BigInt(0),
          affected_runs: BigInt(3),
          open_alerts: BigInt(2),
          acknowledged_alerts: BigInt(1),
          resolved_alerts: BigInt(0),
        },
        {
          location_id: 'loc-2',
          total: BigInt(2),
          critical: BigInt(0),
          high: BigInt(1),
          medium: BigInt(1),
          low: BigInt(0),
          unknown: BigInt(0),
          affected_runs: BigInt(2),
          open_alerts: BigInt(0),
          acknowledged_alerts: BigInt(1),
          resolved_alerts: BigInt(1),
        },
      ]);

      const result = await repo.getFailedItemsSummaryByLocation(mockOrgId, {});

      expect(result).toHaveLength(2);
      expect(result[0].locationId).toBe('loc-1');
      expect(result[0].total).toBe(5);
      expect(result[0].critical).toBe(2);
      expect(result[0].affectedRuns).toBe(3);
      expect(result[0].openAlerts).toBe(2);
      expect(result[1].locationId).toBe('loc-2');
      expect(result[1].total).toBe(2);
    });

    it('includes null locationId', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          location_id: null,
          total: BigInt(3),
          critical: BigInt(1),
          high: BigInt(0),
          medium: BigInt(1),
          low: BigInt(1),
          unknown: BigInt(0),
          affected_runs: BigInt(2),
          open_alerts: BigInt(1),
          acknowledged_alerts: BigInt(0),
          resolved_alerts: BigInt(0),
        },
      ]);

      const result = await repo.getFailedItemsSummaryByLocation(mockOrgId, {});

      expect(result).toHaveLength(1);
      expect(result[0].locationId).toBeNull();
      expect(result[0].total).toBe(3);
    });

    it('returns correct severity buckets per location', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          location_id: 'loc-1',
          total: BigInt(5),
          critical: BigInt(1),
          high: BigInt(1),
          medium: BigInt(1),
          low: BigInt(1),
          unknown: BigInt(1),
          affected_runs: BigInt(2),
          open_alerts: BigInt(0),
          acknowledged_alerts: BigInt(0),
          resolved_alerts: BigInt(0),
        },
      ]);

      const result = await repo.getFailedItemsSummaryByLocation(mockOrgId, {});

      expect(result[0].critical).toBe(1);
      expect(result[0].high).toBe(1);
      expect(result[0].medium).toBe(1);
      expect(result[0].low).toBe(1);
      expect(result[0].unknown).toBe(1);
      expect(result[0].total).toBe(5);
    });

    it('returns correct affectedRuns distinct count per location', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          location_id: 'loc-1',
          total: BigInt(10),
          critical: BigInt(0),
          high: BigInt(0),
          medium: BigInt(0),
          low: BigInt(0),
          unknown: BigInt(0),
          affected_runs: BigInt(4),
          open_alerts: BigInt(0),
          acknowledged_alerts: BigInt(0),
          resolved_alerts: BigInt(0),
        },
      ]);

      const result = await repo.getFailedItemsSummaryByLocation(mockOrgId, {});

      expect(result[0].affectedRuns).toBe(4);
    });

    it('returns correct latest alert status counts per location', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          location_id: 'loc-1',
          total: BigInt(3),
          critical: BigInt(0),
          high: BigInt(0),
          medium: BigInt(0),
          low: BigInt(0),
          unknown: BigInt(0),
          affected_runs: BigInt(2),
          open_alerts: BigInt(2),
          acknowledged_alerts: BigInt(1),
          resolved_alerts: BigInt(0),
        },
      ]);

      const result = await repo.getFailedItemsSummaryByLocation(mockOrgId, {});

      expect(result[0].openAlerts).toBe(2);
      expect(result[0].acknowledgedAlerts).toBe(1);
      expect(result[0].resolvedAlerts).toBe(0);
    });

    it('passes filters to query', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await repo.getFailedItemsSummaryByLocation(mockOrgId, {
        brandId: 'brand-1',
        locationId: 'loc-1',
        zoneId: 'zone-1',
        checklistTemplateId: 'tpl-1',
        severity: 'CRITICAL',
        from: '2025-03-01',
        to: '2025-03-15',
      });

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      const call = prisma.$queryRaw.mock.calls[0][0];
      const queryStr = call.strings.join('');
      expect(queryStr).toContain('filtered_failed_items');
      expect(queryStr).toContain('latest_alerts');
      expect(queryStr).toContain('DISTINCT ON');
      expect(queryStr).toContain('source_type');
      expect(queryStr).toContain('CHECKLIST_RUN_ITEM');
      expect(queryStr).toContain('location_id');
      expect(queryStr).toContain('ORDER BY');
    });

    it('scopes query by organizationId for tenant isolation', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await repo.getFailedItemsSummaryByLocation('org-tenant-1', {});

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      const sqlArg = prisma.$queryRaw.mock.calls[0][0];
      const fullQuery = Array.isArray(sqlArg?.strings)
        ? sqlArg.strings.join(' ')
        : String(sqlArg);
      expect(fullQuery).toMatch(/organization_id|organization\.id/i);
    });

    it('ordering is correct (critical DESC, open DESC, total DESC, locationId ASC)', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          location_id: 'loc-critical',
          total: BigInt(5),
          critical: BigInt(3),
          high: BigInt(0),
          medium: BigInt(0),
          low: BigInt(0),
          unknown: BigInt(0),
          affected_runs: BigInt(2),
          open_alerts: BigInt(2),
          acknowledged_alerts: BigInt(0),
          resolved_alerts: BigInt(0),
        },
        {
          location_id: 'loc-high-open',
          total: BigInt(4),
          critical: BigInt(0),
          high: BigInt(2),
          medium: BigInt(0),
          low: BigInt(0),
          unknown: BigInt(0),
          affected_runs: BigInt(2),
          open_alerts: BigInt(3),
          acknowledged_alerts: BigInt(0),
          resolved_alerts: BigInt(0),
        },
        {
          location_id: 'loc-low',
          total: BigInt(1),
          critical: BigInt(0),
          high: BigInt(0),
          medium: BigInt(0),
          low: BigInt(0),
          unknown: BigInt(0),
          affected_runs: BigInt(1),
          open_alerts: BigInt(0),
          acknowledged_alerts: BigInt(0),
          resolved_alerts: BigInt(0),
        },
      ]);

      const result = await repo.getFailedItemsSummaryByLocation(mockOrgId, {});

      expect(result[0].locationId).toBe('loc-critical');
      expect(result[0].critical).toBe(3);
      expect(result[1].locationId).toBe('loc-high-open');
      expect(result[1].openAlerts).toBe(3);
      expect(result[2].locationId).toBe('loc-low');
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
