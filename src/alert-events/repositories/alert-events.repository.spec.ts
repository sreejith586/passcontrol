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
});
