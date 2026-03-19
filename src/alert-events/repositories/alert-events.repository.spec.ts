import { Test, TestingModule } from '@nestjs/testing';
import { AlertEventsRepository } from './alert-events.repository';
import { PrismaService } from '../../infra/prisma/prisma.service';

describe('AlertEventsRepository', () => {
  let repo: AlertEventsRepository;
  let prisma: {
    $queryRaw: jest.Mock;
    alertEvent?: { findMany: jest.Mock; count: jest.Mock };
  };

  const mockOrgId = 'org-123';

  beforeEach(async () => {
    prisma = {
      $queryRaw: jest.fn(),
      alertEvent: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
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

  describe('list', () => {
    it('date-only from: uses gte start of day UTC', async () => {
      await repo.list(mockOrgId, { from: '2025-03-15' }, { page: 1, limit: 25 }, { triggeredAt: 'desc' });

      expect(prisma.alertEvent!.findMany).toHaveBeenCalledTimes(1);
      const where = (prisma.alertEvent!.findMany as jest.Mock).mock.calls[0][0].where;
      expect(where.triggeredAt).toBeDefined();
      expect(where.triggeredAt.gte).toEqual(new Date('2025-03-15T00:00:00.000Z'));
      expect(where.triggeredAt.lte).toBeUndefined();
      expect(where.triggeredAt.lt).toBeUndefined();
    });

    it('date-only to: uses lt next day UTC (through end of day)', async () => {
      await repo.list(mockOrgId, { to: '2025-03-15' }, { page: 1, limit: 25 }, { triggeredAt: 'desc' });

      expect(prisma.alertEvent!.findMany).toHaveBeenCalledTimes(1);
      const where = (prisma.alertEvent!.findMany as jest.Mock).mock.calls[0][0].where;
      expect(where.triggeredAt).toBeDefined();
      expect(where.triggeredAt.lt).toEqual(new Date('2025-03-16T00:00:00.000Z'));
      expect(where.triggeredAt.lte).toBeUndefined();
      expect(where.triggeredAt.gte).toBeUndefined();
    });

    it('date-only from and to: includes full UTC day', async () => {
      await repo.list(
        mockOrgId,
        { from: '2025-03-15', to: '2025-03-15' },
        { page: 1, limit: 25 },
        { triggeredAt: 'desc' },
      );

      expect(prisma.alertEvent!.findMany).toHaveBeenCalledTimes(1);
      const where = (prisma.alertEvent!.findMany as jest.Mock).mock.calls[0][0].where;
      expect(where.triggeredAt.gte).toEqual(new Date('2025-03-15T00:00:00.000Z'));
      expect(where.triggeredAt.lt).toEqual(new Date('2025-03-16T00:00:00.000Z'));
    });

    it('full ISO datetime to: preserves precise lte', async () => {
      await repo.list(
        mockOrgId,
        { to: '2025-03-15T10:30:00.000Z' },
        { page: 1, limit: 25 },
        { triggeredAt: 'desc' },
      );

      expect(prisma.alertEvent!.findMany).toHaveBeenCalledTimes(1);
      const where = (prisma.alertEvent!.findMany as jest.Mock).mock.calls[0][0].where;
      expect(where.triggeredAt.lte).toEqual(new Date('2025-03-15T10:30:00.000Z'));
      expect(where.triggeredAt.lt).toBeUndefined();
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

    it('passes assignedToUserId filter to query', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: BigInt(0) }]);

      await repo.listEscalations(
        mockOrgId,
        {
          assignedToUserId: 'user-123',
        },
        { page: 1, limit: 25 },
        mockNow,
      );

      const call = prisma.$queryRaw.mock.calls[0][0];
      const queryStr = call.strings.join('');
      expect(queryStr).toContain('assigned_to_user_id');
    });

    it('passes assignedToUserId null for unassigned filter', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: BigInt(0) }]);

      await repo.listEscalations(
        mockOrgId,
        {
          assignedToUserId: null,
        },
        { page: 1, limit: 25 },
        mockNow,
      );

      const call = prisma.$queryRaw.mock.calls[0][0];
      const queryStr = call.strings.join('');
      expect(queryStr).toContain('assigned_to_user_id');
      expect(queryStr).toContain('IS NULL');
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

  describe('getEscalationsSummary', () => {
    const mockNow = new Date('2025-03-17T12:00:00Z');

    const zeroBuckets = {
      critical: { total: 0, acknowledgeBreached: 0, resolveBreached: 0 },
      high: { total: 0, acknowledgeBreached: 0, resolveBreached: 0 },
      medium: { total: 0, acknowledgeBreached: 0, resolveBreached: 0 },
      low: { total: 0, acknowledgeBreached: 0, resolveBreached: 0 },
      unknown: { total: 0, acknowledgeBreached: 0, resolveBreached: 0 },
    };

    it('returns zero-filled buckets when no data', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await repo.getEscalationsSummary(mockOrgId, {}, mockNow);

      expect(result).toEqual({
        totalActiveAlerts: 0,
        acknowledgeBreached: 0,
        resolveBreached: 0,
        bySeverity: zeroBuckets,
      });
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('returns correct breached counts', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          severity_bucket: 'critical',
          total: BigInt(3),
          acknowledge_breached: BigInt(2),
          resolve_breached: BigInt(1),
        },
      ]);

      const result = await repo.getEscalationsSummary(mockOrgId, {}, mockNow);

      expect(result.totalActiveAlerts).toBe(3);
      expect(result.acknowledgeBreached).toBe(2);
      expect(result.resolveBreached).toBe(1);
      expect(result.bySeverity.critical).toEqual({
        total: 3,
        acknowledgeBreached: 2,
        resolveBreached: 1,
      });
    });

    it('aggregates severity breakdown correctly', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { severity_bucket: 'critical', total: BigInt(1), acknowledge_breached: BigInt(1), resolve_breached: BigInt(1) },
        { severity_bucket: 'high', total: BigInt(2), acknowledge_breached: BigInt(0), resolve_breached: BigInt(1) },
      ]);

      const result = await repo.getEscalationsSummary(mockOrgId, {}, mockNow);

      expect(result.totalActiveAlerts).toBe(3);
      expect(result.acknowledgeBreached).toBe(1);
      expect(result.resolveBreached).toBe(2);
      expect(result.bySeverity.critical).toEqual({
        total: 1,
        acknowledgeBreached: 1,
        resolveBreached: 1,
      });
      expect(result.bySeverity.high).toEqual({
        total: 2,
        acknowledgeBreached: 0,
        resolveBreached: 1,
      });
      expect(result.bySeverity.medium).toEqual(zeroBuckets.medium);
    });

    it('passes filters to query', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await repo.getEscalationsSummary(
        mockOrgId,
        {
          brandId: 'brand-1',
          locationId: 'loc-1',
          zoneId: 'zone-1',
          severity: 'HIGH',
          status: 'OPEN',
        },
        mockNow,
      );

      const call = prisma.$queryRaw.mock.calls[0][0];
      const queryStr = call.strings.join('');
      expect(queryStr).toContain('organization_id');
      expect(queryStr).toContain('OPEN');
      expect(queryStr).toContain('ACKNOWLEDGED');
    });

    it('scopes query by organizationId for tenant isolation', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await repo.getEscalationsSummary('org-tenant-1', {}, mockNow);

      const call = prisma.$queryRaw.mock.calls[0][0];
      const queryStr = call.strings.join('');
      expect(queryStr).toMatch(/organization_id/);
    });

    it('uses application-provided now for breach computation', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const now = new Date('2025-03-20T15:30:00Z');
      await repo.getEscalationsSummary(mockOrgId, {}, now);

      expect(prisma.$queryRaw).toHaveBeenCalledWith(
        expect.objectContaining({
          strings: expect.any(Array),
        }),
      );
    });
  });

  describe('getEscalationsSummaryByLocation', () => {
    const mockNow = new Date('2025-03-17T12:00:00Z');

    const zeroBySeverity = {
      critical: { total: 0, acknowledgeBreached: 0, resolveBreached: 0 },
      high: { total: 0, acknowledgeBreached: 0, resolveBreached: 0 },
      medium: { total: 0, acknowledgeBreached: 0, resolveBreached: 0 },
      low: { total: 0, acknowledgeBreached: 0, resolveBreached: 0 },
      unknown: { total: 0, acknowledgeBreached: 0, resolveBreached: 0 },
    };

    it('returns empty items when no data', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await repo.getEscalationsSummaryByLocation(mockOrgId, {}, mockNow);

      expect(result.items).toHaveLength(0);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('groups by location', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          location_id: 'loc-1',
          severity_bucket: 'critical',
          total: BigInt(2),
          acknowledge_breached: BigInt(1),
          resolve_breached: BigInt(1),
        },
        {
          location_id: 'loc-1',
          severity_bucket: 'high',
          total: BigInt(1),
          acknowledge_breached: BigInt(0),
          resolve_breached: BigInt(0),
        },
      ]);

      const result = await repo.getEscalationsSummaryByLocation(mockOrgId, {}, mockNow);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].locationId).toBe('loc-1');
      expect(result.items[0].totalActiveAlerts).toBe(3);
      expect(result.items[0].acknowledgeBreached).toBe(1);
      expect(result.items[0].resolveBreached).toBe(1);
      expect(result.items[0].bySeverity.critical).toEqual({
        total: 2,
        acknowledgeBreached: 1,
        resolveBreached: 1,
      });
      expect(result.items[0].bySeverity.high).toEqual({
        total: 1,
        acknowledgeBreached: 0,
        resolveBreached: 0,
      });
    });

    it('includes null location', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          location_id: null,
          severity_bucket: 'medium',
          total: BigInt(1),
          acknowledge_breached: BigInt(0),
          resolve_breached: BigInt(0),
        },
      ]);

      const result = await repo.getEscalationsSummaryByLocation(mockOrgId, {}, mockNow);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].locationId).toBeNull();
      expect(result.items[0].totalActiveAlerts).toBe(1);
    });

    it('orders by resolveBreached DESC, acknowledgeBreached DESC, total DESC, locationId ASC NULLS LAST', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { location_id: 'loc-low', severity_bucket: 'low', total: BigInt(1), acknowledge_breached: BigInt(0), resolve_breached: BigInt(0) },
        { location_id: 'loc-high', severity_bucket: 'critical', total: BigInt(2), acknowledge_breached: BigInt(1), resolve_breached: BigInt(2) },
        { location_id: null, severity_bucket: 'medium', total: BigInt(3), acknowledge_breached: BigInt(2), resolve_breached: BigInt(1) },
      ]);

      const result = await repo.getEscalationsSummaryByLocation(mockOrgId, {}, mockNow);

      expect(result.items).toHaveLength(3);
      expect(result.items[0].locationId).toBe('loc-high');
      expect(result.items[0].resolveBreached).toBe(2);
      expect(result.items[1].locationId).toBe(null);
      expect(result.items[1].resolveBreached).toBe(1);
      expect(result.items[2].locationId).toBe('loc-low');
      expect(result.items[2].resolveBreached).toBe(0);
    });

    it('passes filters to query', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await repo.getEscalationsSummaryByLocation(
        mockOrgId,
        { brandId: 'brand-1', severity: 'HIGH', status: 'OPEN' },
        mockNow,
      );

      const call = prisma.$queryRaw.mock.calls[0][0];
      const queryStr = call.strings.join('');
      expect(queryStr).toContain('organization_id');
      expect(queryStr).toContain('location_id');
    });

    it('scopes query by organizationId for tenant isolation', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await repo.getEscalationsSummaryByLocation('org-tenant-1', {}, mockNow);

      const call = prisma.$queryRaw.mock.calls[0][0];
      const queryStr = call.strings.join('');
      expect(queryStr).toMatch(/organization_id/);
    });
  });

  describe('listPrioritizedEscalations', () => {
    const mockNow = new Date('2025-03-17T12:00:00Z');

    const mockPrioritizedRow = (overrides: Partial<{
      id: string;
      severity: string | null;
      status: string;
      created_at: Date;
      acknowledged_at: Date | null;
      resolved_at: Date | null;
      ack_breached: boolean;
      res_breached: boolean;
      ack_overdue_minutes: number;
      res_overdue_minutes: number;
      rank_group: string;
      score_hint: number;
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
      ack_overdue_minutes: 120,
      res_overdue_minutes: 60,
      rank_group: 'RESOLVE_BREACHED',
      score_hint: 60,
      ...overrides,
    });

    it('resolve-breached sorts before acknowledge-breached', async () => {
      prisma.$queryRaw.mockResolvedValue([
        mockPrioritizedRow({ id: 'res-1', rank_group: 'RESOLVE_BREACHED', res_breached: true }),
        mockPrioritizedRow({ id: 'ack-1', rank_group: 'ACKNOWLEDGE_BREACHED', res_breached: false, ack_breached: true }),
      ]);

      const result = await repo.listPrioritizedEscalations(mockOrgId, {}, 25, mockNow);

      expect(result).toHaveLength(2);
      expect(result[0].priority.rankGroup).toBe('RESOLVE_BREACHED');
      expect(result[1].priority.rankGroup).toBe('ACKNOWLEDGE_BREACHED');
    });

    it('acknowledge-breached sorts before active non-breached', async () => {
      prisma.$queryRaw.mockResolvedValue([
        mockPrioritizedRow({ id: 'ack-1', rank_group: 'ACKNOWLEDGE_BREACHED' }),
        mockPrioritizedRow({ id: 'active-1', rank_group: 'ACTIVE_NOT_BREACHED', ack_breached: false, res_breached: false }),
      ]);

      const result = await repo.listPrioritizedEscalations(mockOrgId, {}, 25, mockNow);

      expect(result[0].priority.rankGroup).toBe('ACKNOWLEDGE_BREACHED');
      expect(result[1].priority.rankGroup).toBe('ACTIVE_NOT_BREACHED');
    });

    it('severity ordering within same group', async () => {
      prisma.$queryRaw.mockResolvedValue([
        mockPrioritizedRow({ id: '1', severity: 'CRITICAL', rank_group: 'RESOLVE_BREACHED' }),
        mockPrioritizedRow({ id: '2', severity: 'HIGH', rank_group: 'RESOLVE_BREACHED' }),
        mockPrioritizedRow({ id: '3', severity: 'MEDIUM', rank_group: 'RESOLVE_BREACHED' }),
      ]);

      const result = await repo.listPrioritizedEscalations(mockOrgId, {}, 25, mockNow);

      expect(result[0].severity).toBe('CRITICAL');
      expect(result[1].severity).toBe('HIGH');
      expect(result[2].severity).toBe('MEDIUM');
    });

    it('overdue duration ordering', async () => {
      prisma.$queryRaw.mockResolvedValue([
        mockPrioritizedRow({ id: '1', res_overdue_minutes: 120, score_hint: 120 }),
        mockPrioritizedRow({ id: '2', res_overdue_minutes: 60, score_hint: 60 }),
      ]);

      const result = await repo.listPrioritizedEscalations(mockOrgId, {}, 25, mockNow);

      expect(result[0].sla.resolveOverdueMinutes).toBe(120);
      expect(result[1].sla.resolveOverdueMinutes).toBe(60);
    });

    it('limit works', async () => {
      prisma.$queryRaw.mockResolvedValue([
        mockPrioritizedRow({ id: '1' }),
        mockPrioritizedRow({ id: '2' }),
      ]);

      const result = await repo.listPrioritizedEscalations(mockOrgId, {}, 2, mockNow);

      expect(result).toHaveLength(2);
      expect(prisma.$queryRaw).toHaveBeenCalledWith(
        expect.anything(),
      );
      const call = prisma.$queryRaw.mock.calls[0][0];
      expect(call.strings.some((s: string) => s.includes('LIMIT'))).toBe(true);
    });

    it('filters apply', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await repo.listPrioritizedEscalations(
        mockOrgId,
        { brandId: 'b1', locationId: 'l1', severity: 'HIGH', status: 'OPEN' },
        25,
        mockNow,
      );

      const call = prisma.$queryRaw.mock.calls[0][0];
      const queryStr = call.strings.join('');
      expect(queryStr).toContain('organization_id');
    });

    it('scopes query by organizationId for tenant isolation', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await repo.listPrioritizedEscalations('org-tenant-1', {}, 25, mockNow);

      const call = prisma.$queryRaw.mock.calls[0][0];
      const queryStr = call.strings.join('');
      expect(queryStr).toMatch(/organization_id/);
    });

    it('acknowledged alerts never ack-breached', async () => {
      prisma.$queryRaw.mockResolvedValue([
        mockPrioritizedRow({
          id: 'ack-1',
          status: 'ACKNOWLEDGED',
          acknowledged_at: new Date('2025-03-17T10:10:00Z'),
          ack_breached: false,
          res_breached: true,
          rank_group: 'RESOLVE_BREACHED',
        }),
      ]);

      const result = await repo.listPrioritizedEscalations(mockOrgId, {}, 25, mockNow);

      expect(result[0].sla.acknowledgeBreached).toBe(false);
      expect(result[0].sla.resolveBreached).toBe(true);
    });

    it('returns correct response shape with priority and overdue minutes', async () => {
      prisma.$queryRaw.mockResolvedValue([
        mockPrioritizedRow({
          id: 'alert-1',
          ack_overdue_minutes: 30,
          res_overdue_minutes: 90,
          rank_group: 'RESOLVE_BREACHED',
          score_hint: 90,
        }),
      ]);

      const result = await repo.listPrioritizedEscalations(mockOrgId, {}, 25, mockNow);

      expect(result[0].alertEventId).toBe('alert-1');
      expect(result[0].sla.acknowledgeOverdueMinutes).toBe(30);
      expect(result[0].sla.resolveOverdueMinutes).toBe(90);
      expect(result[0].priority.rankGroup).toBe('RESOLVE_BREACHED');
      expect(result[0].priority.scoreHint).toBe(90);
    });
  });

  describe('getSlaCompliance', () => {
    const mockNow = new Date('2025-03-17T12:00:00Z');

    const mockRow = (overrides: Partial<{
      total_alerts: bigint;
      ack_within_sla: bigint;
      ack_breached: bigint;
      res_within_sla: bigint;
      res_breached: bigint;
    }> = {}) => ({
      total_alerts: BigInt(0),
      ack_within_sla: BigInt(0),
      ack_breached: BigInt(0),
      res_within_sla: BigInt(0),
      res_breached: BigInt(0),
      ...overrides,
    });

    it('returns empty result when no data', async () => {
      prisma.$queryRaw.mockResolvedValue([mockRow()]);

      const result = await repo.getSlaCompliance(mockOrgId, {}, mockNow);

      expect(result).toEqual({
        totalAlerts: 0,
        ackWithinSla: 0,
        ackBreached: 0,
        resWithinSla: 0,
        resBreached: 0,
      });
    });

    it('acknowledged within SLA', async () => {
      prisma.$queryRaw.mockResolvedValue([
        mockRow({
          total_alerts: BigInt(1),
          ack_within_sla: BigInt(1),
          ack_breached: BigInt(0),
          res_within_sla: BigInt(0),
          res_breached: BigInt(0),
        }),
      ]);

      const result = await repo.getSlaCompliance(mockOrgId, {}, mockNow);

      expect(result.ackWithinSla).toBe(1);
      expect(result.ackBreached).toBe(0);
    });

    it('acknowledged after SLA', async () => {
      prisma.$queryRaw.mockResolvedValue([
        mockRow({
          total_alerts: BigInt(1),
          ack_within_sla: BigInt(0),
          ack_breached: BigInt(1),
          res_within_sla: BigInt(0),
          res_breached: BigInt(0),
        }),
      ]);

      const result = await repo.getSlaCompliance(mockOrgId, {}, mockNow);

      expect(result.ackWithinSla).toBe(0);
      expect(result.ackBreached).toBe(1);
    });

    it('resolved within SLA', async () => {
      prisma.$queryRaw.mockResolvedValue([
        mockRow({
          total_alerts: BigInt(1),
          ack_within_sla: BigInt(1),
          ack_breached: BigInt(0),
          res_within_sla: BigInt(1),
          res_breached: BigInt(0),
        }),
      ]);

      const result = await repo.getSlaCompliance(mockOrgId, {}, mockNow);

      expect(result.resWithinSla).toBe(1);
      expect(result.resBreached).toBe(0);
    });

    it('resolved after SLA', async () => {
      prisma.$queryRaw.mockResolvedValue([
        mockRow({
          total_alerts: BigInt(1),
          ack_within_sla: BigInt(1),
          ack_breached: BigInt(0),
          res_within_sla: BigInt(0),
          res_breached: BigInt(1),
        }),
      ]);

      const result = await repo.getSlaCompliance(mockOrgId, {}, mockNow);

      expect(result.resWithinSla).toBe(0);
      expect(result.resBreached).toBe(1);
    });

    it('passes filters to query', async () => {
      prisma.$queryRaw.mockResolvedValue([mockRow()]);

      await repo.getSlaCompliance(
        mockOrgId,
        {
          brandId: 'brand-1',
          locationId: 'loc-1',
          zoneId: 'zone-1',
          severity: 'HIGH',
          status: 'RESOLVED',
          from: '2025-03-01',
          to: '2025-03-15',
        },
        mockNow,
      );

      const call = prisma.$queryRaw.mock.calls[0][0];
      const queryStr = call.strings.join('');
      expect(queryStr).toContain('organization_id');
      expect(queryStr).toContain('created_at');
    });

    it('scopes query by organizationId for tenant isolation', async () => {
      prisma.$queryRaw.mockResolvedValue([mockRow()]);

      await repo.getSlaCompliance('org-tenant-1', {}, mockNow);

      const call = prisma.$queryRaw.mock.calls[0][0];
      const queryStr = call.strings.join('');
      expect(queryStr).toMatch(/organization_id/);
    });

    it('uses application-provided now for breach computation', async () => {
      prisma.$queryRaw.mockResolvedValue([mockRow()]);

      const now = new Date('2025-03-20T15:30:00Z');
      await repo.getSlaCompliance(mockOrgId, {}, now);

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('aggregates mixed compliance correctly', async () => {
      prisma.$queryRaw.mockResolvedValue([
        mockRow({
          total_alerts: BigInt(10),
          ack_within_sla: BigInt(6),
          ack_breached: BigInt(2),
          res_within_sla: BigInt(5),
          res_breached: BigInt(3),
        }),
      ]);

      const result = await repo.getSlaCompliance(mockOrgId, {}, mockNow);

      expect(result.totalAlerts).toBe(10);
      expect(result.ackWithinSla).toBe(6);
      expect(result.ackBreached).toBe(2);
      expect(result.resWithinSla).toBe(5);
      expect(result.resBreached).toBe(3);
    });
  });

  describe('getEscalationsTrends', () => {
    const mockNow = new Date('2025-03-17T12:00:00Z');

    it('returns empty points when no data', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await repo.getEscalationsTrends(
        mockOrgId,
        {},
        'day',
        mockNow,
      );

      expect(result).toEqual([]);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('returns correct counts per bucket', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          bucket: new Date('2025-03-01'),
          total_active_alerts: BigInt(5),
          acknowledge_breached: BigInt(2),
          resolve_breached: BigInt(1),
        },
      ]);

      const result = await repo.getEscalationsTrends(
        mockOrgId,
        {},
        'day',
        mockNow,
      );

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2025-03-01');
      expect(result[0].totalActiveAlerts).toBe(5);
      expect(result[0].acknowledgeBreached).toBe(2);
      expect(result[0].resolveBreached).toBe(1);
    });

    it('acknowledge breach counts correct', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          bucket: new Date('2025-03-02'),
          total_active_alerts: BigInt(3),
          acknowledge_breached: BigInt(3),
          resolve_breached: BigInt(0),
        },
      ]);

      const result = await repo.getEscalationsTrends(
        mockOrgId,
        {},
        'day',
        mockNow,
      );

      expect(result[0].acknowledgeBreached).toBe(3);
    });

    it('resolve breach counts correct', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          bucket: new Date('2025-03-03'),
          total_active_alerts: BigInt(2),
          acknowledge_breached: BigInt(0),
          resolve_breached: BigInt(2),
        },
      ]);

      const result = await repo.getEscalationsTrends(
        mockOrgId,
        {},
        'day',
        mockNow,
      );

      expect(result[0].resolveBreached).toBe(2);
    });

    it('ordering ascending by date', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          bucket: new Date('2025-03-01'),
          total_active_alerts: BigInt(1),
          acknowledge_breached: BigInt(0),
          resolve_breached: BigInt(0),
        },
        {
          bucket: new Date('2025-03-02'),
          total_active_alerts: BigInt(2),
          acknowledge_breached: BigInt(0),
          resolve_breached: BigInt(0),
        },
        {
          bucket: new Date('2025-03-03'),
          total_active_alerts: BigInt(1),
          acknowledge_breached: BigInt(0),
          resolve_breached: BigInt(0),
        },
      ]);

      const result = await repo.getEscalationsTrends(
        mockOrgId,
        {},
        'day',
        mockNow,
      );

      expect(result[0].date).toBe('2025-03-01');
      expect(result[1].date).toBe('2025-03-02');
      expect(result[2].date).toBe('2025-03-03');
    });

    it('interval grouping works for week', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          bucket: new Date('2025-03-03'), // week start
          total_active_alerts: BigInt(4),
          acknowledge_breached: BigInt(1),
          resolve_breached: BigInt(0),
        },
      ]);

      const result = await repo.getEscalationsTrends(
        mockOrgId,
        {},
        'week',
        mockNow,
      );

      expect(result).toHaveLength(1);
      expect(result[0].totalActiveAlerts).toBe(4);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      // Interval is parameterized; verify DATE_TRUNC pattern exists
      const call = prisma.$queryRaw.mock.calls[0][0];
      const queryStr = call.strings.join('');
      expect(queryStr).toContain('DATE_TRUNC');
    });

    it('passes filters to query', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await repo.getEscalationsTrends(
        mockOrgId,
        {
          brandId: 'brand-1',
          locationId: 'loc-1',
          zoneId: 'zone-1',
          severity: 'HIGH',
          status: 'OPEN',
          from: '2025-03-01',
          to: '2025-03-15',
        },
        'day',
        mockNow,
      );

      const call = prisma.$queryRaw.mock.calls[0][0];
      const queryStr = call.strings.join('');
      expect(queryStr).toContain('organization_id');
      expect(queryStr).toContain('OPEN');
      expect(queryStr).toContain('ACKNOWLEDGED');
    });

    it('scopes query by organizationId for tenant isolation', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await repo.getEscalationsTrends('org-tenant-1', {}, 'day', mockNow);

      const call = prisma.$queryRaw.mock.calls[0][0];
      const queryStr = call.strings.join('');
      expect(queryStr).toMatch(/organization_id/);
    });

    it('uses application-provided now for breach computation', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const now = new Date('2025-03-20T15:30:00Z');
      await repo.getEscalationsTrends(mockOrgId, {}, 'day', now);

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('falls back to day when invalid interval passed', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await repo.getEscalationsTrends(
        mockOrgId,
        {},
        'invalid' as 'day',
        mockNow,
      );

      expect(result).toEqual([]);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });
});
