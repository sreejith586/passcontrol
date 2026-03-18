import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AlertEventsService } from './alert-events.service';
import { AlertEventsRepository } from '../repositories/alert-events.repository';
import { AlertSlaResolverService } from './alert-sla-resolver.service';
import { AlertEventActivitiesService } from '../../alert-event-activities/services/alert-event-activities.service';
import { AlertEventCommentsRepository } from '../../alert-event-comments/repositories/alert-event-comments.repository';
import { AuditLogsService } from '../../audit/services/audit-logs.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { DOMAIN_EVENT_PUBLISHER } from '../../common/domain-events/contracts/domain-event-publisher.interface';

describe('AlertEventsService (assignment)', () => {
  let service: AlertEventsService;
  let repo: jest.Mocked<AlertEventsRepository>;
  let audit: jest.Mocked<AuditLogsService>;

  const mockOrgId = 'org-123';
  const mockCtx = { organizationId: mockOrgId, userId: 'user-1' };

  const mockOpenAlert = {
    id: 'alert-1',
    status: 'OPEN',
    assignedToUserId: null,
    assignedAt: null,
    assignedByUserId: null,
    organizationId: mockOrgId,
  };

  const mockAcknowledgedAlert = {
    ...mockOpenAlert,
    id: 'alert-2',
    status: 'ACKNOWLEDGED',
  };

  const mockResolvedAlert = {
    ...mockOpenAlert,
    id: 'alert-3',
    status: 'RESOLVED',
  };

  const mockAssignedAlert = {
    ...mockOpenAlert,
    assignedToUserId: 'user-2',
    assignedAt: new Date('2025-03-18T10:00:00Z'),
    assignedByUserId: 'user-1',
  };

  beforeEach(async () => {
    const mockRepo = {
      findById: jest.fn(),
      assign: jest.fn(),
      unassign: jest.fn(),
      list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      listEscalations: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      listPrioritizedEscalations: jest.fn().mockResolvedValue([]),
    };
    const mockSlaResolver = { resolve: jest.fn() };
    const mockAudit = { recordWrite: jest.fn() };
    const mockActivities = {
      logAssignmentChanged: jest.fn().mockResolvedValue(undefined),
    };
    const mockPrisma = { $transaction: jest.fn((fn) => fn({})) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertEventsService,
        { provide: AlertEventsRepository, useValue: mockRepo },
        { provide: AlertSlaResolverService, useValue: mockSlaResolver },
        { provide: AlertEventActivitiesService, useValue: mockActivities },
        { provide: AlertEventCommentsRepository, useValue: { create: jest.fn() } },
        { provide: AuditLogsService, useValue: mockAudit },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: DOMAIN_EVENT_PUBLISHER, useValue: { publish: jest.fn() } },
      ],
    }).compile();

    service = module.get(AlertEventsService);
    repo = module.get(AlertEventsRepository);
    audit = module.get(AuditLogsService);
  });

  describe('assign', () => {
    it('assigns OPEN alert', async () => {
      repo.findById.mockResolvedValue(mockOpenAlert as never);
      repo.assign.mockResolvedValue(mockAssignedAlert as never);

      const result = await service.assign(mockCtx, 'alert-1', {
        assignedToUserId: 'user-2',
      });

      expect(result).toEqual({
        id: 'alert-1',
        status: 'OPEN',
        assignedToUserId: 'user-2',
        assignedAt: '2025-03-18T10:00:00.000Z',
        assignedByUserId: 'user-1',
      });
      expect(repo.assign).toHaveBeenCalledWith(
        mockOrgId,
        'alert-1',
        'user-2',
        'user-1',
        expect.anything(),
      );
      expect(audit.recordWrite).toHaveBeenCalledWith(
        'ALERT_ASSIGN',
        mockCtx,
        'alert-1',
        expect.any(Object),
      );
    });

    it('assigns ACKNOWLEDGED alert', async () => {
      repo.findById.mockResolvedValue(mockAcknowledgedAlert as never);
      repo.assign.mockResolvedValue({
        ...mockAcknowledgedAlert,
        assignedToUserId: 'user-2',
        assignedAt: new Date(),
        assignedByUserId: 'user-1',
      } as never);

      const result = await service.assign(mockCtx, 'alert-2', {
        assignedToUserId: 'user-2',
      });

      expect(result.assignedToUserId).toBe('user-2');
      expect(repo.assign).toHaveBeenCalled();
    });

    it('rejects assign RESOLVED alert', async () => {
      repo.findById.mockResolvedValue(mockResolvedAlert as never);

      await expect(
        service.assign(mockCtx, 'alert-3', { assignedToUserId: 'user-2' }),
      ).rejects.toThrow(BadRequestException);

      expect(repo.assign).not.toHaveBeenCalled();
    });

    it('scopes by organizationId for tenant isolation', async () => {
      repo.findById.mockResolvedValue(mockOpenAlert as never);
      repo.assign.mockResolvedValue(mockAssignedAlert as never);

      const ctx = { organizationId: 'org-tenant-xyz', userId: 'u1' };
      await service.assign(ctx, 'alert-1', { assignedToUserId: 'user-2' });

      expect(repo.assign).toHaveBeenCalledWith(
        'org-tenant-xyz',
        'alert-1',
        'user-2',
        'u1',
        expect.anything(),
      );
    });
  });

  describe('unassign', () => {
    it('unassigns OPEN alert', async () => {
      repo.findById.mockResolvedValue(mockAssignedAlert as never);
      repo.unassign.mockResolvedValue({
        ...mockAssignedAlert,
        assignedToUserId: null,
        assignedAt: null,
        assignedByUserId: null,
      } as never);

      const result = await service.unassign(mockCtx, 'alert-1');

      expect(result.assignedToUserId).toBeNull();
      expect(result.assignedAt).toBeNull();
      expect(result.assignedByUserId).toBeNull();
      expect(repo.unassign).toHaveBeenCalledWith(mockOrgId, 'alert-1', expect.anything());
      expect(audit.recordWrite).toHaveBeenCalledWith(
        'ALERT_UNASSIGN',
        mockCtx,
        'alert-1',
        expect.any(Object),
      );
    });

    it('rejects unassign RESOLVED alert', async () => {
      repo.findById.mockResolvedValue(mockResolvedAlert as never);

      await expect(service.unassign(mockCtx, 'alert-3')).rejects.toThrow(
        BadRequestException,
      );

      expect(repo.unassign).not.toHaveBeenCalled();
    });

    it('scopes by organizationId for tenant isolation', async () => {
      repo.findById.mockResolvedValue(mockOpenAlert as never);
      repo.unassign.mockResolvedValue(mockOpenAlert as never);

      const ctx = { organizationId: 'org-tenant-xyz' };
      await service.unassign(ctx, 'alert-1');

      expect(repo.unassign).toHaveBeenCalledWith('org-tenant-xyz', 'alert-1', expect.anything());
    });
  });

  describe('assignment filters', () => {
    it('passes assignedUserId filter to list', async () => {
      await service.list(mockCtx, {
        assignedUserId: 'user-2',
      } as never);

      expect(repo.list).toHaveBeenCalledWith(
        mockOrgId,
        expect.objectContaining({ assignedToUserId: 'user-2' }),
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('passes assignedToMe filter to list', async () => {
      await service.list(mockCtx, { assignedToMe: true } as never);

      expect(repo.list).toHaveBeenCalledWith(
        mockOrgId,
        expect.objectContaining({ assignedToUserId: 'user-1' }),
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('passes unassignedOnly filter to list', async () => {
      await service.list(mockCtx, { unassignedOnly: true } as never);

      expect(repo.list).toHaveBeenCalledWith(
        mockOrgId,
        expect.objectContaining({ assignedToUserId: null }),
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('unassignedOnly takes precedence over assignedToMe', async () => {
      await service.list(mockCtx, {
        unassignedOnly: true,
        assignedToMe: true,
      } as never);

      expect(repo.list).toHaveBeenCalledWith(
        mockOrgId,
        expect.objectContaining({ assignedToUserId: null }),
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('passes assignment filter to escalations', async () => {
      await service.getEscalations(mockCtx, {
        assignedUserId: 'user-2',
      } as never);

      expect(repo.listEscalations).toHaveBeenCalledWith(
        mockOrgId,
        expect.objectContaining({ assignedToUserId: 'user-2' }),
        expect.any(Object),
        expect.any(Date),
      );
    });

    it('passes assignment filter to prioritized escalations', async () => {
      await service.getPrioritizedEscalations(mockCtx, {
        unassignedOnly: true,
      } as never);

      expect(repo.listPrioritizedEscalations).toHaveBeenCalledWith(
        mockOrgId,
        expect.objectContaining({ assignedToUserId: null }),
        expect.any(Number),
        expect.any(Date),
      );
    });
  });
});
