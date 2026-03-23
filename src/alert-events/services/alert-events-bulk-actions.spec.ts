import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AlertEventsService } from './alert-events.service';
import { AlertEventsRepository } from '../repositories/alert-events.repository';
import { AlertSlaResolverService } from './alert-sla-resolver.service';
import { AlertEventActivitiesService } from '../../alert-event-activities/services/alert-event-activities.service';
import { AlertEventCommentsRepository } from '../../alert-event-comments/repositories/alert-event-comments.repository';
import { AuditLogsService } from '../../audit/services/audit-logs.service';
import { UsersService } from '../../users/services/users.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { DOMAIN_EVENT_PUBLISHER } from '../../common/domain-events/contracts/domain-event-publisher.interface';

describe('AlertEventsService (bulk actions)', () => {
  let service: AlertEventsService;
  let acknowledgeSpy: jest.SpyInstance;
  let resolveSpy: jest.SpyInstance;

  const mockOrgId = 'org-123';
  const mockCtx = { organizationId: mockOrgId, userId: 'user-1' };

  beforeEach(async () => {
    const mockRepo = {
      findById: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      list: jest.fn(),
      listEscalations: jest.fn(),
      getEscalationsSummary: jest.fn(),
      getEscalationsSummaryByLocation: jest.fn(),
      getEscalationsTrends: jest.fn(),
      getSlaCompliance: jest.fn(),
    };
    const mockSlaResolver = {
      resolve: jest.fn().mockResolvedValue({
        acknowledgeWithinMinutes: 60,
        resolveWithinMinutes: 240,
      }),
    };
    const mockActivities = {
      logAcknowledged: jest.fn().mockResolvedValue(undefined),
      logResolved: jest.fn().mockResolvedValue(undefined),
    };
    const mockPrisma = {
      $transaction: jest.fn((fn) => fn({})),
      organization: {
        findUnique: jest.fn().mockResolvedValue({
          requireResolutionNoteOnResolve: false,
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertEventsService,
        { provide: AlertEventsRepository, useValue: mockRepo },
        { provide: AlertSlaResolverService, useValue: mockSlaResolver },
        { provide: AlertEventActivitiesService, useValue: mockActivities },
        { provide: AlertEventCommentsRepository, useValue: { create: jest.fn() } },
        { provide: AuditLogsService, useValue: { recordWrite: jest.fn() } },
        { provide: UsersService, useValue: { belongsToOrganization: jest.fn().mockResolvedValue(true) } },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: DOMAIN_EVENT_PUBLISHER, useValue: { publish: jest.fn() } },
      ],
    }).compile();

    service = module.get(AlertEventsService);
    acknowledgeSpy = jest.spyOn(service, 'acknowledge');
    resolveSpy = jest.spyOn(service, 'resolve');
  });

  afterEach(() => {
    acknowledgeSpy?.mockRestore();
    resolveSpy?.mockRestore();
  });

  describe('bulkAcknowledge', () => {
    it('multiple successes', async () => {
      acknowledgeSpy.mockResolvedValue(undefined);

      const result = await service.bulkAcknowledge(mockCtx, {
        alertEventIds: ['id-1', 'id-2', 'id-3'],
      });

      expect(result).toEqual({
        requested: 3,
        processed: 3,
        succeeded: 3,
        failed: 0,
        results: [
          { alertEventId: 'id-1', success: true },
          { alertEventId: 'id-2', success: true },
          { alertEventId: 'id-3', success: true },
        ],
      });
      expect(acknowledgeSpy).toHaveBeenCalledTimes(3);
      expect(acknowledgeSpy).toHaveBeenCalledWith(mockCtx, 'id-1');
      expect(acknowledgeSpy).toHaveBeenCalledWith(mockCtx, 'id-2');
      expect(acknowledgeSpy).toHaveBeenCalledWith(mockCtx, 'id-3');
    });

    it('partial success', async () => {
      acknowledgeSpy
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new BadRequestException('Only OPEN alerts can be acknowledged'))
        .mockResolvedValueOnce(undefined);

      const result = await service.bulkAcknowledge(mockCtx, {
        alertEventIds: ['id-1', 'id-2', 'id-3'],
      });

      expect(result).toEqual({
        requested: 3,
        processed: 3,
        succeeded: 2,
        failed: 1,
        results: [
          { alertEventId: 'id-1', success: true },
          { alertEventId: 'id-2', success: false, error: 'Alert already acknowledged' },
          { alertEventId: 'id-3', success: true },
        ],
      });
    });

    it('duplicate ids processed once', async () => {
      acknowledgeSpy.mockResolvedValue(undefined);

      const result = await service.bulkAcknowledge(mockCtx, {
        alertEventIds: ['id-1', 'id-1', 'id-2', 'id-1'],
      });

      expect(result.requested).toBe(4);
      expect(result.processed).toBe(2);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
      expect(acknowledgeSpy).toHaveBeenCalledTimes(2);
      expect(acknowledgeSpy).toHaveBeenCalledWith(mockCtx, 'id-1');
      expect(acknowledgeSpy).toHaveBeenCalledWith(mockCtx, 'id-2');
    });

    it('correct summary counts', async () => {
      acknowledgeSpy
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new NotFoundException('Alert event not found'));

      const result = await service.bulkAcknowledge(mockCtx, {
        alertEventIds: ['id-1', 'id-2'],
      });

      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.succeeded + result.failed).toBe(result.processed);
    });

    it('maps NotFoundException to concise error', async () => {
      acknowledgeSpy.mockRejectedValue(new NotFoundException('Alert event not found'));

      const result = await service.bulkAcknowledge(mockCtx, {
        alertEventIds: ['id-1'],
      });

      expect(result.results[0].error).toBe('Alert not found');
    });

    it('scopes by organizationId for tenant isolation', async () => {
      acknowledgeSpy.mockResolvedValue(undefined);

      const ctx = { organizationId: 'org-tenant-xyz', userId: 'u1' };
      await service.bulkAcknowledge(ctx, { alertEventIds: ['id-1'] });

      expect(acknowledgeSpy).toHaveBeenCalledWith(ctx, 'id-1');
    });
  });

  describe('bulkResolve', () => {
    it('multiple successes', async () => {
      resolveSpy.mockResolvedValue(undefined);

      const result = await service.bulkResolve(mockCtx, {
        alertEventIds: ['id-1', 'id-2'],
      });

      expect(result).toEqual({
        requested: 2,
        processed: 2,
        succeeded: 2,
        failed: 0,
        results: [
          { alertEventId: 'id-1', success: true },
          { alertEventId: 'id-2', success: true },
        ],
      });
      expect(resolveSpy).toHaveBeenCalledTimes(2);
      expect(resolveSpy).toHaveBeenCalledWith(mockCtx, 'id-1', undefined, {
        requireResolutionNote: false,
      });
      expect(resolveSpy).toHaveBeenCalledWith(mockCtx, 'id-2', undefined, {
        requireResolutionNote: false,
      });
    });

    it('resolutionNote propagation', async () => {
      resolveSpy.mockResolvedValue(undefined);

      await service.bulkResolve(mockCtx, {
        alertEventIds: ['id-1', 'id-2'],
        resolutionNote: 'Resolved in bulk',
      });

      expect(resolveSpy).toHaveBeenCalledWith(mockCtx, 'id-1', 'Resolved in bulk', {
        requireResolutionNote: false,
      });
      expect(resolveSpy).toHaveBeenCalledWith(mockCtx, 'id-2', 'Resolved in bulk', {
        requireResolutionNote: false,
      });
    });

    it('partial success', async () => {
      resolveSpy
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new BadRequestException('Alert is already resolved'));

      const result = await service.bulkResolve(mockCtx, {
        alertEventIds: ['id-1', 'id-2'],
      });

      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results[1].error).toBe('Alert already resolved');
    });

    it('maps NotFoundException to concise error', async () => {
      resolveSpy.mockRejectedValue(new NotFoundException());

      const result = await service.bulkResolve(mockCtx, {
        alertEventIds: ['id-1'],
      });

      expect(result.results[0].error).toBe('Alert not found');
    });

    it('scopes by organizationId for tenant isolation', async () => {
      resolveSpy.mockResolvedValue(undefined);

      const ctx = { organizationId: 'org-tenant-xyz', userId: 'u1' };
      await service.bulkResolve(ctx, { alertEventIds: ['id-1'] });

      expect(resolveSpy).toHaveBeenCalledWith(ctx, 'id-1', undefined, {
        requireResolutionNote: false,
      });
    });

    it('fails with Resolution note is required when policy enabled and no note', async () => {
      const mockPrismaWithPolicy = {
        $transaction: jest.fn((fn) => fn({})),
        organization: {
          findUnique: jest.fn().mockResolvedValue({
            requireResolutionNoteOnResolve: true,
          }),
        },
      };
      const moduleRef = await Test.createTestingModule({
        providers: [
          AlertEventsService,
          { provide: AlertEventsRepository, useValue: { findById: jest.fn() } },
          { provide: AlertSlaResolverService, useValue: { resolve: jest.fn() } },
          {
            provide: AlertEventActivitiesService,
            useValue: { logResolved: jest.fn(), logAcknowledged: jest.fn() },
          },
          { provide: AlertEventCommentsRepository, useValue: { create: jest.fn() } },
          { provide: AuditLogsService, useValue: { recordWrite: jest.fn() } },
          { provide: UsersService, useValue: { belongsToOrganization: jest.fn().mockResolvedValue(true) } },
          { provide: PrismaService, useValue: mockPrismaWithPolicy },
          { provide: DOMAIN_EVENT_PUBLISHER, useValue: { publish: jest.fn() } },
        ],
      }).compile();
      const svc = moduleRef.get(AlertEventsService);
      const repoMock = moduleRef.get(AlertEventsRepository) as jest.Mocked<AlertEventsRepository>;
      repoMock.findById.mockResolvedValue({
        id: 'id-1',
        organizationId: mockOrgId,
        status: 'ACKNOWLEDGED',
      } as never);

      const result = await svc.bulkResolve(mockCtx, {
        alertEventIds: ['id-1'],
      });

      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.results[0].error).toBe('Resolution note is required');
    });
  });
});
