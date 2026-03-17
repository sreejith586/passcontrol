import { Test, TestingModule } from '@nestjs/testing';
import { AlertSlaPolicyRepository } from './alert-sla-policy.repository';
import { PrismaService } from '../../infra/prisma/prisma.service';

describe('AlertSlaPolicyRepository (admin)', () => {
  let repo: AlertSlaPolicyRepository;
  let prisma: {
    $queryRaw: jest.Mock;
    alertSlaPolicy: {
      findFirst: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  const mockOrgId = 'org-123';

  beforeEach(async () => {
    prisma = {
      $queryRaw: jest.fn(),
      alertSlaPolicy: {
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertSlaPolicyRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repo = module.get(AlertSlaPolicyRepository);
  });

  describe('findById', () => {
    it('returns policy when found', async () => {
      const policy = { id: 'p1', organizationId: mockOrgId };
      prisma.alertSlaPolicy.findFirst.mockResolvedValue(policy);

      const result = await repo.findById(mockOrgId, 'p1');

      expect(result).toBe(policy);
      expect(prisma.alertSlaPolicy.findFirst).toHaveBeenCalledWith({
        where: { id: 'p1', organizationId: mockOrgId },
      });
    });

    it('returns null when not found', async () => {
      prisma.alertSlaPolicy.findFirst.mockResolvedValue(null);

      const result = await repo.findById(mockOrgId, 'p1');

      expect(result).toBeNull();
    });
  });

  describe('findMany', () => {
    it('applies filters and pagination', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await repo.findMany(
        mockOrgId,
        { brandId: 'b1', severity: 'HIGH', isActive: true },
        { page: 2, limit: 10 },
      );

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      const call = prisma.$queryRaw.mock.calls[0][0];
      const queryStr = call.strings.join(' ');
      expect(queryStr).toContain('organization_id');
      expect(queryStr).toContain('brand_id');
      expect(queryStr).toContain('severity');
      expect(queryStr).toContain('is_active');
      expect(queryStr).toContain('LIMIT');
      expect(queryStr).toContain('OFFSET');
      expect(queryStr).toContain('CASE severity');
      expect(queryStr).toContain('MEDIUM');
      expect(queryStr).toContain('LOW');
    });

    it('orders severity by business priority (MEDIUM before LOW)', async () => {
      const mediumPolicy = {
        id: 'p-medium',
        organization_id: mockOrgId,
        brand_id: null,
        location_id: null,
        zone_id: null,
        severity: 'MEDIUM',
        acknowledge_within_minutes: 60,
        resolve_within_minutes: 240,
        is_active: true,
        created_at: new Date('2025-03-17T10:00:00Z'),
        updated_at: new Date('2025-03-17T10:00:00Z'),
      };
      const lowPolicy = {
        id: 'p-low',
        organization_id: mockOrgId,
        brand_id: null,
        location_id: null,
        zone_id: null,
        severity: 'LOW',
        acknowledge_within_minutes: 120,
        resolve_within_minutes: 480,
        is_active: true,
        created_at: new Date('2025-03-17T10:00:00Z'),
        updated_at: new Date('2025-03-17T10:00:00Z'),
      };
      prisma.$queryRaw.mockResolvedValue([mediumPolicy, lowPolicy]);

      const result = await repo.findMany(
        mockOrgId,
        {},
        { page: 1, limit: 25 },
      );

      expect(result).toHaveLength(2);
      expect(result[0].severity).toBe('MEDIUM');
      expect(result[1].severity).toBe('LOW');
      expect(result[0].acknowledgeWithinMinutes).toBe(60);
      expect(result[1].acknowledgeWithinMinutes).toBe(120);
    });
  });

  describe('count', () => {
    it('applies same filters as findMany', async () => {
      prisma.alertSlaPolicy.count.mockResolvedValue(5);

      const result = await repo.count(mockOrgId, {
        locationId: 'loc-1',
        isActive: false,
      });

      expect(result).toBe(5);
      expect(prisma.alertSlaPolicy.count).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrgId,
          locationId: 'loc-1',
          isActive: false,
        },
      });
    });
  });

  describe('findConflictingActivePolicy', () => {
    it('finds policy with same scope and severity', async () => {
      prisma.alertSlaPolicy.findFirst.mockResolvedValue({ id: 'conflict' });

      const result = await repo.findConflictingActivePolicy(mockOrgId, {
        severity: 'CRITICAL',
        brandId: 'b1',
        locationId: 'loc-1',
        zoneId: null,
      });

      expect(result).toEqual({ id: 'conflict' });
      expect(prisma.alertSlaPolicy.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrgId,
          severity: 'CRITICAL',
          brandId: 'b1',
          locationId: 'loc-1',
          zoneId: null,
          isActive: true,
        },
        select: { id: true },
      });
    });

    it('excludes policy when excludePolicyId provided', async () => {
      prisma.alertSlaPolicy.findFirst.mockResolvedValue(null);

      await repo.findConflictingActivePolicy(
        mockOrgId,
        { severity: 'HIGH', brandId: null, locationId: null, zoneId: null },
        'p-exclude',
      );

      expect(prisma.alertSlaPolicy.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrgId,
          severity: 'HIGH',
          brandId: null,
          locationId: null,
          zoneId: null,
          isActive: true,
          id: { not: 'p-exclude' },
        },
        select: { id: true },
      });
    });
  });

  describe('create', () => {
    it('creates policy with provided data', async () => {
      const created = {
        id: 'p-new',
        organizationId: mockOrgId,
        severity: 'CRITICAL',
        brandId: null,
        locationId: null,
        zoneId: null,
        acknowledgeWithinMinutes: 15,
        resolveWithinMinutes: 60,
        isActive: true,
      };
      prisma.alertSlaPolicy.create.mockResolvedValue(created);

      const result = await repo.create({
        organizationId: mockOrgId,
        severity: 'CRITICAL',
        brandId: null,
        locationId: null,
        zoneId: null,
        acknowledgeWithinMinutes: 15,
        resolveWithinMinutes: 60,
        isActive: true,
      });

      expect(result).toEqual(created);
      expect(prisma.alertSlaPolicy.create).toHaveBeenCalledWith({
        data: {
          organizationId: mockOrgId,
          severity: 'CRITICAL',
          brandId: null,
          locationId: null,
          zoneId: null,
          acknowledgeWithinMinutes: 15,
          resolveWithinMinutes: 60,
          isActive: true,
        },
      });
    });
  });

  describe('update', () => {
    it('updates and returns policy', async () => {
      const updated = { id: 'p1', acknowledgeWithinMinutes: 30 };
      prisma.alertSlaPolicy.updateMany.mockResolvedValue({ count: 1 });
      prisma.alertSlaPolicy.findFirst.mockResolvedValue(updated);

      const result = await repo.update(mockOrgId, 'p1', {
        acknowledgeWithinMinutes: 30,
      });

      expect(result).toEqual(updated);
      expect(prisma.alertSlaPolicy.updateMany).toHaveBeenCalledWith({
        where: { id: 'p1', organizationId: mockOrgId },
        data: { acknowledgeWithinMinutes: 30 },
      });
      expect(prisma.alertSlaPolicy.findFirst).toHaveBeenCalledWith({
        where: { id: 'p1', organizationId: mockOrgId },
      });
    });
  });
});
