import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AlertSlaPoliciesService } from './alert-sla-policies.service';
import { AlertSlaPolicyRepository } from '../repositories/alert-sla-policy.repository';
import { AuditLogsService } from '../../audit/services/audit-logs.service';

describe('AlertSlaPoliciesService', () => {
  let service: AlertSlaPoliciesService;
  let repo: jest.Mocked<AlertSlaPolicyRepository>;
  let audit: jest.Mocked<AuditLogsService>;

  const mockOrgId = 'org-123';
  const mockCtx = { organizationId: mockOrgId, userId: 'user-1' };

  const mockPolicy = {
    id: 'policy-1',
    organizationId: mockOrgId,
    severity: 'CRITICAL',
    brandId: null,
    locationId: null,
    zoneId: null,
    acknowledgeWithinMinutes: 15,
    resolveWithinMinutes: 60,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepo = {
      findById: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findConflictingActivePolicy: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
    };
    const mockAudit = { recordWrite: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertSlaPoliciesService,
        { provide: AlertSlaPolicyRepository, useValue: mockRepo },
        { provide: AuditLogsService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get(AlertSlaPoliciesService);
    repo = module.get(AlertSlaPolicyRepository);
    audit = module.get(AuditLogsService);
  });

  describe('create', () => {
    it('creates org default policy', async () => {
      repo.findConflictingActivePolicy.mockResolvedValue(null);
      repo.create.mockResolvedValue(mockPolicy);

      const result = await service.create(mockCtx, {
        severity: 'CRITICAL',
        acknowledgeWithinMinutes: 15,
        resolveWithinMinutes: 60,
      });

      expect(result).toEqual(mockPolicy);
      expect(repo.findConflictingActivePolicy).toHaveBeenCalledWith(
        mockOrgId,
        {
          severity: 'CRITICAL',
          brandId: null,
          locationId: null,
          zoneId: null,
        },
      );
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: mockOrgId,
          severity: 'CRITICAL',
          brandId: null,
          locationId: null,
          zoneId: null,
          acknowledgeWithinMinutes: 15,
          resolveWithinMinutes: 60,
          isActive: true,
        }),
      );
      expect(audit.recordWrite).toHaveBeenCalledWith(
        'ALERT_SLA_POLICY_CREATE',
        mockCtx,
        mockPolicy.id,
        expect.any(Object),
      );
    });

    it('creates brand-scoped policy', async () => {
      repo.findConflictingActivePolicy.mockResolvedValue(null);
      repo.create.mockResolvedValue({ ...mockPolicy, brandId: 'brand-1' });

      await service.create(mockCtx, {
        severity: 'HIGH',
        brandId: 'brand-1',
        acknowledgeWithinMinutes: 30,
        resolveWithinMinutes: 120,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          brandId: 'brand-1',
          locationId: null,
        }),
      );
    });

    it('creates location-scoped policy', async () => {
      repo.findConflictingActivePolicy.mockResolvedValue(null);
      repo.create.mockResolvedValue({
        ...mockPolicy,
        brandId: 'brand-1',
        locationId: 'loc-1',
      });

      await service.create(mockCtx, {
        severity: 'MEDIUM',
        brandId: 'brand-1',
        locationId: 'loc-1',
        acknowledgeWithinMinutes: 60,
        resolveWithinMinutes: 240,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          brandId: 'brand-1',
          locationId: 'loc-1',
        }),
      );
    });

    it('rejects resolve < acknowledge', async () => {
      await expect(
        service.create(mockCtx, {
          severity: 'CRITICAL',
          acknowledgeWithinMinutes: 60,
          resolveWithinMinutes: 30,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(repo.create).not.toHaveBeenCalled();
    });

    it('rejects conflicting active policy', async () => {
      repo.findConflictingActivePolicy.mockResolvedValue({ id: 'conflict' });

      await expect(
        service.create(mockCtx, {
          severity: 'CRITICAL',
          acknowledgeWithinMinutes: 15,
          resolveWithinMinutes: 60,
        }),
      ).rejects.toThrow(ConflictException);

      expect(repo.create).not.toHaveBeenCalled();
    });

    it('allows inactive duplicate when isActive=false', async () => {
      repo.findConflictingActivePolicy.mockResolvedValue(null);
      repo.create.mockResolvedValue({ ...mockPolicy, isActive: false });

      await service.create(mockCtx, {
        severity: 'CRITICAL',
        acknowledgeWithinMinutes: 15,
        resolveWithinMinutes: 60,
        isActive: false,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('normalizes severity to uppercase', async () => {
      repo.findConflictingActivePolicy.mockResolvedValue(null);
      repo.create.mockResolvedValue(mockPolicy);

      await service.create(mockCtx, {
        severity: 'critical',
        acknowledgeWithinMinutes: 15,
        resolveWithinMinutes: 60,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'CRITICAL' }),
      );
    });

    it('rejects empty severity', async () => {
      await expect(
        service.create(mockCtx, {
          severity: '  ',
          acknowledgeWithinMinutes: 15,
          resolveWithinMinutes: 60,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getById', () => {
    it('returns policy when found', async () => {
      repo.findById.mockResolvedValue(mockPolicy);

      const result = await service.getById({ organizationId: mockOrgId }, 'p1');

      expect(result).toEqual(mockPolicy);
    });

    it('throws NotFoundException when not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        service.getById({ organizationId: mockOrgId }, 'p1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('list', () => {
    it('returns paginated items with filters', async () => {
      repo.findMany.mockResolvedValue([mockPolicy]);
      repo.count.mockResolvedValue(1);

      const result = await service.list(
        { organizationId: mockOrgId },
        { brandId: 'b1', page: 1, limit: 25 },
      );

      expect(result).toEqual({
        items: [mockPolicy],
        total: 1,
        page: 1,
        limit: 25,
      });
      expect(repo.findMany).toHaveBeenCalledWith(
        mockOrgId,
        { brandId: 'b1', locationId: undefined, severity: undefined, isActive: undefined },
        { page: 1, limit: 25 },
      );
    });

    it('caps limit at 100', async () => {
      repo.findMany.mockResolvedValue([]);
      repo.count.mockResolvedValue(0);

      await service.list(
        { organizationId: mockOrgId },
        { limit: 200 },
      );

      expect(repo.findMany).toHaveBeenCalledWith(
        mockOrgId,
        expect.any(Object),
        { page: 1, limit: 100 },
      );
    });
  });

  describe('update', () => {
    it('updates policy successfully', async () => {
      repo.findById.mockResolvedValue(mockPolicy);
      repo.findConflictingActivePolicy.mockResolvedValue(null);
      repo.update.mockResolvedValue({
        ...mockPolicy,
        acknowledgeWithinMinutes: 30,
      });

      const result = await service.update(mockCtx, 'p1', {
        acknowledgeWithinMinutes: 30,
      });

      expect(result).toBeDefined();
      expect(result!.acknowledgeWithinMinutes).toBe(30);
      expect(repo.update).toHaveBeenCalledWith(
        mockOrgId,
        'p1',
        { acknowledgeWithinMinutes: 30 },
      );
      expect(audit.recordWrite).toHaveBeenCalledWith(
        'ALERT_SLA_POLICY_UPDATE',
        mockCtx,
        'p1',
        expect.any(Object),
      );
    });

    it('rejects update when resolve < acknowledge', async () => {
      repo.findById.mockResolvedValue(mockPolicy);

      await expect(
        service.update(mockCtx, 'p1', {
          acknowledgeWithinMinutes: 120,
          resolveWithinMinutes: 60,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(repo.update).not.toHaveBeenCalled();
    });

    it('rejects update when conflicting with another active policy', async () => {
      repo.findById.mockResolvedValue(mockPolicy);
      repo.findConflictingActivePolicy.mockResolvedValue({ id: 'other' });

      await expect(
        service.update(mockCtx, 'p1', {
          severity: 'HIGH',
          brandId: 'brand-1',
          locationId: 'loc-1',
        }),
      ).rejects.toThrow(ConflictException);

      expect(repo.update).not.toHaveBeenCalled();
    });

    it('allows update when deactivating (no conflict check)', async () => {
      repo.findById.mockResolvedValue(mockPolicy);
      repo.update.mockResolvedValue({ ...mockPolicy, isActive: false });

      await service.update(mockCtx, 'p1', { isActive: false });

      expect(repo.findConflictingActivePolicy).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith(
        mockOrgId,
        'p1',
        { isActive: false },
      );
    });

    it('scopes by organizationId for tenant isolation', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        service.getById({ organizationId: 'org-other' }, 'p1'),
      ).rejects.toThrow(NotFoundException);

      expect(repo.findById).toHaveBeenCalledWith('org-other', 'p1');
    });
  });
});
