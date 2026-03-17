import { Test, TestingModule } from '@nestjs/testing';
import { AlertEventsRepository } from './alert-events.repository';
import { PrismaService } from '../../infra/prisma/prisma.service';

describe('AlertEventsRepository', () => {
  let repo: AlertEventsRepository;
  let prisma: { $queryRaw: jest.Mock };

  const mockOrgId = 'org-123';

  beforeEach(async () => {
    prisma = {
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertEventsRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repo = module.get(AlertEventsRepository);
  });

  it('should be defined', () => {
    expect(repo).toBeDefined();
  });

  describe('getTrends', () => {
    it('returns empty points when no data', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await repo.getTrends(mockOrgId, {}, 'day');

      expect(result).toEqual([]);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('returns correct created counts', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          bucket: new Date('2025-03-01'),
          created: BigInt(5),
          acknowledged: BigInt(0),
          resolved: BigInt(0),
        },
      ]);

      const result = await repo.getTrends(mockOrgId, {}, 'day');

      expect(result[0].created).toBe(5);
      expect(result[0].acknowledged).toBe(0);
      expect(result[0].resolved).toBe(0);
    });

    it('returns correct acknowledged counts', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          bucket: new Date('2025-03-01'),
          created: BigInt(0),
          acknowledged: BigInt(3),
          resolved: BigInt(0),
        },
      ]);

      const result = await repo.getTrends(mockOrgId, {}, 'day');

      expect(result[0].acknowledged).toBe(3);
    });

    it('returns correct resolved counts', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          bucket: new Date('2025-03-01'),
          created: BigInt(0),
          acknowledged: BigInt(0),
          resolved: BigInt(2),
        },
      ]);

      const result = await repo.getTrends(mockOrgId, {}, 'day');

      expect(result[0].resolved).toBe(2);
    });

    it('ordering is correct (date ASC)', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { bucket: new Date('2025-03-01'), created: BigInt(1), acknowledged: BigInt(0), resolved: BigInt(0) },
        { bucket: new Date('2025-03-02'), created: BigInt(2), acknowledged: BigInt(0), resolved: BigInt(0) },
        { bucket: new Date('2025-03-03'), created: BigInt(1), acknowledged: BigInt(0), resolved: BigInt(0) },
      ]);

      const result = await repo.getTrends(mockOrgId, {}, 'day');

      expect(result[0].date).toBe('2025-03-01');
      expect(result[1].date).toBe('2025-03-02');
      expect(result[2].date).toBe('2025-03-03');
    });

    it('passes dimension filters to query', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await repo.getTrends(mockOrgId, {
        brandId: 'brand-1',
        locationId: 'loc-1',
        zoneId: 'zone-1',
        severity: 'HIGH',
      }, 'week');

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      const call = prisma.$queryRaw.mock.calls[0][0];
      const queryStr = call.strings.join('');
      expect(queryStr).toContain('filtered_alerts');
      expect(queryStr).toContain('lifecycle_events');
      expect(queryStr).toContain('UNION ALL');
    });

    it('passes from/to to query for date filtering', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await repo.getTrends(mockOrgId, {
        from: '2025-03-01',
        to: '2025-03-15',
      }, 'day');

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('applies date filtering to each lifecycle timestamp independently', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await repo.getTrends(mockOrgId, {
        from: '2025-03-01',
        to: '2025-03-15',
      }, 'day');

      const call = prisma.$queryRaw.mock.calls[0][0];
      const queryStr = call.strings.join('');
      expect(queryStr).toContain('created_at');
      expect(queryStr).toContain('acknowledged_at');
      expect(queryStr).toContain('resolved_at');
      expect(queryStr).toContain('UNION ALL');
    });

    it('scopes query by organizationId for tenant isolation', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await repo.getTrends('org-tenant-1', {}, 'day');

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      const sqlArg = prisma.$queryRaw.mock.calls[0][0];
      const fullQuery = Array.isArray(sqlArg?.strings)
        ? sqlArg.strings.join(' ')
        : String(sqlArg);
      expect(fullQuery).toMatch(/organization_id/);
    });

    it('falls back to day when invalid interval passed', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await repo.getTrends(mockOrgId, {}, 'invalid' as 'day');

      expect(result).toEqual([]);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe('listEscalations', () => {
    const mockNow = new Date('2025-03-17T12:00:00Z');

    const mockRow = (overrides: Partial<{
      id: string;
      severity: string | null;
      status: string;
      created_at: Date;
      acknowledged_at: Date | null;
      resolved_at: Date | null;
      ack_breached: boolean;
      res_breached: boolean;
    }> = {}) => ({
      id: 'alert-1',
      severity: 'CRITICAL',
      status: 'OPEN',
      created_at: new Date('2025-03-17T10:00:00Z'),
      acknowledged_at: null,
      resolved_at: null,
      source_type: 'CHECKLIST_RUN_ITEM',
      source_id: 'item-1',
      brand_id: 'brand-1',
      location_id: 'loc-1',
      zone_id: 'zone-1',
      ack_within: 15,
      res_within: 60,
      acknowledge_by: new Date('2025-03-17T10:15:00Z'),
      resolve_by: new Date('2025-03-17T11:00:00Z'),
      ack_breached: true,
      res_breached: true,
      ...overrides,
    });

    it('returns OPEN alert with acknowledge breach', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([mockRow({ ack_breached: true, res_breached: false })])
        .mockResolvedValueOnce([{ count: BigInt(1) }]);

      const result = await repo.listEscalations(
        mockOrgId,
        {},
        { page: 1, limit: 25 },
        mockNow,
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0].sla.acknowledgeBreached).toBe(true);
      expect(result.items[0].sla.resolveBreached).toBe(false);
      expect(result.total).toBe(1);
    });

    it('returns OPEN alert with resolve breach', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([mockRow({ ack_breached: false, res_breached: true })])
        .mockResolvedValueOnce([{ count: BigInt(1) }]);

      const result = await repo.listEscalations(
        mockOrgId,
        {},
        { page: 1, limit: 25 },
        mockNow,
      );

      expect(result.items[0].sla.resolveBreached).toBe(true);
    });

    it('returns ACKNOWLEDGED alert with resolve breach only', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([
          mockRow({
            status: 'ACKNOWLEDGED',
            acknowledged_at: new Date('2025-03-17T10:10:00Z'),
            ack_breached: false,
            res_breached: true,
          }),
        ])
        .mockResolvedValueOnce([{ count: BigInt(1) }]);

      const result = await repo.listEscalations(
        mockOrgId,
        {},
        { page: 1, limit: 25 },
        mockNow,
      );

      expect(result.items[0].status).toBe('ACKNOWLEDGED');
      expect(result.items[0].sla.acknowledgeBreached).toBe(false);
      expect(result.items[0].sla.resolveBreached).toBe(true);
    });

    it('excludes non-breached when onlyBreached=true', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: BigInt(0) }]);

      const result = await repo.listEscalations(
        mockOrgId,
        { onlyBreached: true },
        { page: 1, limit: 25 },
        mockNow,
      );

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
      const call = prisma.$queryRaw.mock.calls[0][0];
      expect(call.strings.join('')).toContain('ack_breached OR res_breached');
    });

    it('returns pagination and total', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([mockRow(), mockRow({ id: 'alert-2' })])
        .mockResolvedValueOnce([{ count: BigInt(42) }]);

      const result = await repo.listEscalations(
        mockOrgId,
        {},
        { page: 2, limit: 10 },
        mockNow,
      );

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(42);
    });

    it('passes filters to query', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: BigInt(0) }]);

      await repo.listEscalations(
        mockOrgId,
        {
          brandId: 'brand-1',
          locationId: 'loc-1',
          zoneId: 'zone-1',
          severity: 'HIGH',
          status: 'OPEN',
        },
        { page: 1, limit: 25 },
        mockNow,
      );

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
      const call = prisma.$queryRaw.mock.calls[0][0];
      const queryStr = call.strings.join('');
      expect(queryStr).toContain('organization_id');
      expect(queryStr).toContain('OPEN');
      expect(queryStr).toContain('ACKNOWLEDGED');
    });

    it('scopes query by organizationId for tenant isolation', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: BigInt(0) }]);

      await repo.listEscalations('org-tenant-1', {}, { page: 1, limit: 25 }, mockNow);

      const call = prisma.$queryRaw.mock.calls[0][0];
      const queryStr = call.strings.join('');
      expect(queryStr).toMatch(/organization_id/);
    });

    it('accepts now parameter for deterministic breach computation', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: BigInt(0) }]);

      const now = new Date('2025-03-20T15:30:00Z');
      const result = await repo.listEscalations(mockOrgId, {}, { page: 1, limit: 25 }, now);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    });
  });
});
