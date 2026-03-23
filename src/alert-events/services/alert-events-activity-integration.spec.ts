import { Test, TestingModule } from '@nestjs/testing';
import { AlertEventsService } from './alert-events.service';
import { AlertEventsRepository } from '../repositories/alert-events.repository';
import { AlertSlaResolverService } from './alert-sla-resolver.service';
import { AlertEventActivitiesService } from '../../alert-event-activities/services/alert-event-activities.service';
import { AlertEventCommentsRepository } from '../../alert-event-comments/repositories/alert-event-comments.repository';
import { UsersService } from '../../users/services/users.service';
import { AuditLogsService } from '../../audit/services/audit-logs.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { ChecklistSchedulesRepository } from '../../checklists/schedules/repositories/checklist-schedules.repository';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { DOMAIN_EVENT_PUBLISHER } from '../../common/domain-events/contracts/domain-event-publisher.interface';

describe('AlertEventsService (activity integration)', () => {
  let service: AlertEventsService;
  let repo: jest.Mocked<AlertEventsRepository>;
  let scheduleRepo: jest.Mocked<Pick<ChecklistSchedulesRepository, 'getWatcherUserIdsForRun'>>;
  let createNotification: jest.Mock;
  let activities: {
    logCreated: jest.Mock;
    logAcknowledged: jest.Mock;
    logResolved: jest.Mock;
    logReopened: jest.Mock;
    logAssignmentChanged: jest.Mock;
    listForAlert: jest.Mock;
  };
  let prisma: { $transaction: jest.Mock };

  const mockOrgId = 'org-123';
  const mockCtx = { organizationId: mockOrgId, userId: 'user-1' };

  const mockCreatedAlert = {
    id: 'alert-1',
    organizationId: mockOrgId,
    status: 'OPEN',
    sourceType: 'CHECKLIST_RUN_ITEM',
    sourceId: 'item-1',
    acknowledgedAt: null,
    resolvedAt: null,
    assignedToUserId: null,
  };

  beforeEach(async () => {
    const mockRepo = {
      findById: jest.fn(),
      create: jest.fn().mockResolvedValue(mockCreatedAlert),
      update: jest.fn(),
      assign: jest.fn(),
      unassign: jest.fn(),
      list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      listEscalations: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      listPrioritizedEscalations: jest.fn().mockResolvedValue([]),
    };
    const mockSlaResolver = {
      resolve: jest.fn().mockResolvedValue({
        acknowledgeWithinMinutes: 60,
        resolveWithinMinutes: 240,
      }),
    };
    activities = {
      logCreated: jest.fn().mockResolvedValue(undefined),
      logAcknowledged: jest.fn().mockResolvedValue(undefined),
      logResolved: jest.fn().mockResolvedValue(undefined),
      logReopened: jest.fn().mockResolvedValue(undefined),
      logAssignmentChanged: jest.fn().mockResolvedValue(undefined),
      listForAlert: jest.fn().mockResolvedValue([]),
    };
    prisma = {
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
      organization: {
        findUnique: jest.fn().mockResolvedValue({
          requireResolutionNoteOnResolve: false,
          requireReopenNoteOnReopen: false,
        }),
      },
    } as unknown as { $transaction: jest.Mock };

    createNotification = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertEventsService,
        { provide: AlertEventsRepository, useValue: mockRepo },
        { provide: AlertSlaResolverService, useValue: mockSlaResolver },
        { provide: AlertEventActivitiesService, useValue: activities },
        { provide: UsersService, useValue: { belongsToOrganization: jest.fn().mockResolvedValue(true) } },
        { provide: AlertEventCommentsRepository, useValue: { create: jest.fn() } },
        { provide: AuditLogsService, useValue: { recordWrite: jest.fn() } },
        { provide: NotificationsService, useValue: { createNotification } },
        {
          provide: ChecklistSchedulesRepository,
          useValue: { getWatcherUserIdsForRun: jest.fn().mockResolvedValue([]) },
        },
        { provide: PrismaService, useValue: prisma },
        { provide: DOMAIN_EVENT_PUBLISHER, useValue: { publish: jest.fn() } },
      ],
    }).compile();

    service = module.get(AlertEventsService);
    repo = module.get(AlertEventsRepository);
    scheduleRepo = module.get(ChecklistSchedulesRepository);
  });

  describe('createFromPayload', () => {
    it('logs CREATED activity after successful creation', async () => {
      const result = await service.createFromPayload({
        organizationId: mockOrgId,
        sourceType: 'CHECKLIST_RUN_ITEM',
        sourceId: 'item-1',
        type: 'CHECKLIST_ITEM_FAIL',
        scope: {},
        payload: {},
      });

      expect(result.id).toBe('alert-1');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(activities.logCreated).toHaveBeenCalledWith(
        mockOrgId,
        'alert-1',
        expect.anything(),
      );
    });

    it('creates ESCALATION_CREATED notifications for schedule watchers when run has schedule', async () => {
      scheduleRepo.getWatcherUserIdsForRun.mockResolvedValue([
        'user-2',
        'user-3',
      ]);

      await service.createFromPayload({
        organizationId: mockOrgId,
        sourceType: 'CHECKLIST_RUN_ITEM',
        sourceId: 'item-1',
        type: 'CHECKLIST_ITEM_FAIL',
        scope: {},
        payload: {
          runId: 'run-1',
          templateNameSnapshot: 'Daily',
          label: 'Check temp',
          severity: 'CRITICAL',
        },
      });

      expect(scheduleRepo.getWatcherUserIdsForRun).toHaveBeenCalledWith(
        mockOrgId,
        'run-1',
      );
      expect(createNotification).toHaveBeenCalledTimes(2);
      expect(createNotification).toHaveBeenNthCalledWith(
        1,
        mockOrgId,
        expect.objectContaining({
          type: 'ESCALATION_CREATED',
          userIds: ['user-2'],
          sourceType: 'ALERT_EVENT',
          sourceId: 'alert-1',
          dedupeKey: 'ESCALATION_CREATED:alert-1:user-2',
          payload: expect.objectContaining({
            alertEventId: 'alert-1',
            message: 'New escalation created',
          }),
        }),
      );
      expect(createNotification).toHaveBeenNthCalledWith(
        2,
        mockOrgId,
        expect.objectContaining({
          userIds: ['user-3'],
          dedupeKey: 'ESCALATION_CREATED:alert-1:user-3',
        }),
      );
    });

    it('does NOT create ESCALATION_CREATED when run has no watchers', async () => {
      await service.createFromPayload({
        organizationId: mockOrgId,
        sourceType: 'CHECKLIST_RUN_ITEM',
        sourceId: 'item-1',
        type: 'CHECKLIST_ITEM_FAIL',
        scope: {},
        payload: { runId: 'run-1', templateNameSnapshot: 'Daily' },
      });

      expect(createNotification).not.toHaveBeenCalled();
    });
  });

  describe('acknowledge', () => {
    it('logs ACKNOWLEDGED activity after successful acknowledge', async () => {
      const existing = { ...mockCreatedAlert, status: 'OPEN' };
      const updated = { ...mockCreatedAlert, status: 'ACKNOWLEDGED', acknowledgedAt: new Date() };
      repo.findById.mockResolvedValue(existing as never);
      repo.update.mockResolvedValue(updated as never);

      await service.acknowledge(mockCtx, 'alert-1');

      expect(activities.logAcknowledged).toHaveBeenCalledWith(
        mockOrgId,
        'alert-1',
        'OPEN',
        'ACKNOWLEDGED',
        'user-1',
        expect.anything(),
      );
    });

    it('mutation and activity logging are atomic (transaction)', async () => {
      const existing = { ...mockCreatedAlert, status: 'OPEN' };
      const updated = { ...mockCreatedAlert, status: 'ACKNOWLEDGED', acknowledgedAt: new Date() };
      repo.findById.mockResolvedValue(existing as never);
      const callOrder: string[] = [];
      repo.update.mockImplementation(async (...args) => {
        callOrder.push('update');
        return updated as never;
      });
      activities.logAcknowledged.mockImplementation(async (...args) => {
        callOrder.push('logAcknowledged');
        return undefined as never;
      });

      await service.acknowledge(mockCtx, 'alert-1');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(callOrder).toEqual(['update', 'logAcknowledged']);
    });
  });

  describe('resolve', () => {
    it('logs RESOLVED activity after successful resolve', async () => {
      const existing = { ...mockCreatedAlert, status: 'ACKNOWLEDGED' };
      const updated = {
        ...mockCreatedAlert,
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolutionNote: 'Fixed',
      };
      repo.findById.mockResolvedValue(existing as never);
      repo.update.mockResolvedValue(updated as never);

      await service.resolve(mockCtx, 'alert-1', 'Fixed');

      expect(activities.logResolved).toHaveBeenCalledWith(
        mockOrgId,
        'alert-1',
        'ACKNOWLEDGED',
        'RESOLVED',
        'user-1',
        'Fixed',
        expect.anything(),
      );
    });

    it('creates ESCALATION_RESOLVED notification for assignee when alert is assigned', async () => {
      const existing = {
        ...mockCreatedAlert,
        status: 'ACKNOWLEDGED',
        assignedToUserId: 'user-2',
        severity: 'CRITICAL',
      };
      const updated = {
        ...existing,
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolutionNote: 'Fixed',
        severity: 'CRITICAL',
      };
      repo.findById.mockResolvedValue(existing as never);
      repo.update.mockResolvedValue(updated as never);

      await service.resolve(mockCtx, 'alert-1', 'Fixed');

      expect(createNotification).toHaveBeenCalledTimes(1);
      expect(createNotification).toHaveBeenCalledWith(
        mockOrgId,
        expect.objectContaining({
          type: 'ESCALATION_RESOLVED',
          userIds: ['user-2'],
          sourceType: 'ALERT_EVENT',
          sourceId: 'alert-1',
          dedupeKey: 'ESCALATION_RESOLVED:alert-1:user-2',
          payload: expect.objectContaining({ message: 'Escalation resolved' }),
        }),
      );
    });

    it('does NOT create ESCALATION_RESOLVED when alert has no assignee and no watchers', async () => {
      const existing = {
        ...mockCreatedAlert,
        status: 'ACKNOWLEDGED',
        assignedToUserId: null,
        sourceType: 'CHECKLIST_RUN_ITEM',
        payloadJson: { runId: 'run-1' },
      };
      const updated = {
        ...mockCreatedAlert,
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolutionNote: 'Fixed',
      };
      repo.findById.mockResolvedValue(existing as never);
      repo.update.mockResolvedValue(updated as never);
      scheduleRepo.getWatcherUserIdsForRun.mockResolvedValue([]);

      await service.resolve(mockCtx, 'alert-1', 'Fixed');

      expect(createNotification).not.toHaveBeenCalled();
    });

    it('includes schedule watchers in ESCALATION_RESOLVED when alert is from checklist run', async () => {
      const existing = {
        ...mockCreatedAlert,
        status: 'ACKNOWLEDGED',
        assignedToUserId: null,
        sourceType: 'CHECKLIST_RUN_ITEM',
        payloadJson: { runId: 'run-1' },
      };
      const updated = {
        ...mockCreatedAlert,
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolutionNote: 'Fixed',
      };
      repo.findById.mockResolvedValue(existing as never);
      repo.update.mockResolvedValue(updated as never);
      scheduleRepo.getWatcherUserIdsForRun.mockResolvedValue(['user-2', 'user-3']);

      await service.resolve(mockCtx, 'alert-1', 'Fixed');

      expect(createNotification).toHaveBeenCalledTimes(2);
      expect(createNotification).toHaveBeenNthCalledWith(
        1,
        mockOrgId,
        expect.objectContaining({
          type: 'ESCALATION_RESOLVED',
          userIds: ['user-2'],
          dedupeKey: 'ESCALATION_RESOLVED:alert-1:user-2',
        }),
      );
    });

    it('dedupes assignee and watchers when user is both', async () => {
      const existing = {
        ...mockCreatedAlert,
        status: 'ACKNOWLEDGED',
        assignedToUserId: 'user-2',
        sourceType: 'CHECKLIST_RUN_ITEM',
        payloadJson: { runId: 'run-1' },
      };
      const updated = {
        ...mockCreatedAlert,
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolutionNote: 'Fixed',
      };
      repo.findById.mockResolvedValue(existing as never);
      repo.update.mockResolvedValue(updated as never);
      scheduleRepo.getWatcherUserIdsForRun.mockResolvedValue(['user-2', 'user-3']);

      await service.resolve(mockCtx, 'alert-1', 'Fixed');

      expect(createNotification).toHaveBeenCalledTimes(2); // user-2 once, user-3 once
    });

    it('mutation and activity logging are atomic (transaction)', async () => {
      const existing = { ...mockCreatedAlert, status: 'ACKNOWLEDGED' };
      const updated = {
        ...mockCreatedAlert,
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolutionNote: 'Fixed',
      };
      repo.findById.mockResolvedValue(existing as never);
      const callOrder: string[] = [];
      repo.update.mockImplementation(async (...args) => {
        callOrder.push('update');
        return updated as never;
      });
      activities.logResolved.mockImplementation(async (...args) => {
        callOrder.push('logResolved');
        return undefined as never;
      });

      await service.resolve(mockCtx, 'alert-1', 'Fixed');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(callOrder).toEqual(['update', 'logResolved']);
    });
  });

  describe('assign', () => {
    it('logs ASSIGNED when assigning unassigned alert', async () => {
      const existing = { ...mockCreatedAlert, assignedToUserId: null };
      const updated = {
        ...mockCreatedAlert,
        assignedToUserId: 'user-2',
        assignedAt: new Date(),
        assignedByUserId: 'user-1',
      };
      repo.findById.mockResolvedValue(existing as never);
      repo.assign.mockResolvedValue(updated as never);

      await service.assign(mockCtx, 'alert-1', { assignedToUserId: 'user-2' });

      expect(activities.logAssignmentChanged).toHaveBeenCalledWith(
        mockOrgId,
        'alert-1',
        null,
        'user-2',
        'user-1',
        expect.anything(),
      );
    });

    it('mutation and activity logging are atomic (transaction)', async () => {
      const existing = { ...mockCreatedAlert, assignedToUserId: null };
      const updated = {
        ...mockCreatedAlert,
        assignedToUserId: 'user-2',
        assignedAt: new Date(),
        assignedByUserId: 'user-1',
      };
      repo.findById.mockResolvedValue(existing as never);
      const callOrder: string[] = [];
      repo.assign.mockImplementation(async (...args) => {
        callOrder.push('assign');
        return updated as never;
      });
      activities.logAssignmentChanged.mockImplementation(async (...args) => {
        callOrder.push('logAssignmentChanged');
        return undefined as never;
      });

      await service.assign(mockCtx, 'alert-1', { assignedToUserId: 'user-2' });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(callOrder).toEqual(['assign', 'logAssignmentChanged']);
    });

    it('logs REASSIGNED when reassigning alert', async () => {
      const existing = {
        ...mockCreatedAlert,
        assignedToUserId: 'user-2',
        assignedAt: new Date(),
        assignedByUserId: 'user-1',
      };
      const updated = {
        ...mockCreatedAlert,
        assignedToUserId: 'user-3',
        assignedAt: new Date(),
        assignedByUserId: 'user-1',
      };
      repo.findById.mockResolvedValue(existing as never);
      repo.assign.mockResolvedValue(updated as never);

      await service.assign(mockCtx, 'alert-1', { assignedToUserId: 'user-3' });

      expect(activities.logAssignmentChanged).toHaveBeenCalledWith(
        mockOrgId,
        'alert-1',
        'user-2',
        'user-3',
        'user-1',
        expect.anything(),
      );
    });
  });

  describe('unassign', () => {
    it('logs UNASSIGNED after successful unassign', async () => {
      const existing = {
        ...mockCreatedAlert,
        assignedToUserId: 'user-2',
        assignedAt: new Date(),
        assignedByUserId: 'user-1',
      };
      const updated = {
        ...mockCreatedAlert,
        assignedToUserId: null,
        assignedAt: null,
        assignedByUserId: null,
      };
      repo.findById.mockResolvedValue(existing as never);
      repo.unassign.mockResolvedValue(updated as never);

      await service.unassign(mockCtx, 'alert-1');

      expect(activities.logAssignmentChanged).toHaveBeenCalledWith(
        mockOrgId,
        'alert-1',
        'user-2',
        null,
        'user-1',
        expect.anything(),
      );
    });

    it('mutation and activity logging are atomic (transaction)', async () => {
      const existing = {
        ...mockCreatedAlert,
        assignedToUserId: 'user-2',
        assignedAt: new Date(),
        assignedByUserId: 'user-1',
      };
      const updated = {
        ...mockCreatedAlert,
        assignedToUserId: null,
        assignedAt: null,
        assignedByUserId: null,
      };
      repo.findById.mockResolvedValue(existing as never);
      const callOrder: string[] = [];
      repo.unassign.mockImplementation(async (...args) => {
        callOrder.push('unassign');
        return updated as never;
      });
      activities.logAssignmentChanged.mockImplementation(async (...args) => {
        callOrder.push('logAssignmentChanged');
        return undefined as never;
      });

      await service.unassign(mockCtx, 'alert-1');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(callOrder).toEqual(['unassign', 'logAssignmentChanged']);
    });
  });

  describe('reopen', () => {
    it('resolved alert can be reopened', async () => {
      const existing = {
        ...mockCreatedAlert,
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedByUserId: 'user-1',
        assignedToUserId: 'user-2',
        assignedAt: new Date(),
        assignedByUserId: 'user-1',
        acknowledgeWithinMinutes: 60,
        resolveWithinMinutes: 240,
      };
      const updated = {
        ...existing,
        status: 'OPEN',
        acknowledgedAt: null,
        acknowledgedByUserId: null,
        resolvedAt: null,
        resolvedByUserId: null,
        resolutionNote: null,
      };
      repo.findById.mockResolvedValue(existing as never);
      repo.update.mockResolvedValue(updated as never);

      const result = await service.reopen(mockCtx, 'alert-1');

      expect(result).toBeDefined();
      expect(result!.status).toBe('OPEN');
      expect(activities.logReopened).toHaveBeenCalledWith(
        mockOrgId,
        'alert-1',
        'user-1',
        expect.anything(),
      );
    });

    it('OPEN alert cannot be reopened', async () => {
      repo.findById.mockResolvedValue({ ...mockCreatedAlert, status: 'OPEN' } as never);

      await expect(service.reopen(mockCtx, 'alert-1')).rejects.toThrow(
        'Only RESOLVED alerts can be reopened',
      );

      expect(repo.update).not.toHaveBeenCalled();
      expect(activities.logReopened).not.toHaveBeenCalled();
    });

    it('ACKNOWLEDGED alert cannot be reopened', async () => {
      repo.findById.mockResolvedValue({
        ...mockCreatedAlert,
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
      } as never);

      await expect(service.reopen(mockCtx, 'alert-1')).rejects.toThrow(
        'Only RESOLVED alerts can be reopened',
      );

      expect(repo.update).not.toHaveBeenCalled();
      expect(activities.logReopened).not.toHaveBeenCalled();
    });

    it('reopen preserves assignment fields', async () => {
      const existing = {
        ...mockCreatedAlert,
        status: 'RESOLVED',
        assignedToUserId: 'user-2',
        assignedAt: new Date('2025-03-18T10:00:00Z'),
        assignedByUserId: 'user-1',
      };
      const updated = {
        ...existing,
        status: 'OPEN',
        acknowledgedAt: null,
        acknowledgedByUserId: null,
        resolvedAt: null,
        resolvedByUserId: null,
        resolutionNote: null,
        assignedToUserId: 'user-2',
        assignedAt: new Date('2025-03-18T10:00:00Z'),
        assignedByUserId: 'user-1',
      };
      repo.findById.mockResolvedValue(existing as never);
      repo.update.mockImplementation(async (orgId, id, data) => {
        expect(data.assignedToUserId).toBeUndefined();
        expect(data.assignedAt).toBeUndefined();
        expect(data.assignedByUserId).toBeUndefined();
        return updated as never;
      });

      await service.reopen(mockCtx, 'alert-1');

      expect(repo.update).toHaveBeenCalledWith(
        mockOrgId,
        'alert-1',
        expect.objectContaining({
          status: 'OPEN',
          acknowledgedAt: null,
          acknowledgedByUserId: null,
          resolvedAt: null,
          resolvedByUserId: null,
          resolutionNote: null,
        }),
        expect.anything(),
      );
    });

    it('reopen does not modify SLA snapshot fields', async () => {
      const existing = {
        ...mockCreatedAlert,
        status: 'RESOLVED',
        acknowledgeWithinMinutes: 60,
        resolveWithinMinutes: 240,
      };
      const updated = { ...existing, status: 'OPEN', resolvedAt: null, resolvedByUserId: null, resolutionNote: null, acknowledgedAt: null, acknowledgedByUserId: null };
      repo.findById.mockResolvedValue(existing as never);
      repo.update.mockImplementation(async (_orgId, _id, data: Record<string, unknown>) => {
        expect('acknowledgeWithinMinutes' in data).toBe(false);
        expect('resolveWithinMinutes' in data).toBe(false);
        return updated as never;
      });

      await service.reopen(mockCtx, 'alert-1');

      expect(repo.update).toHaveBeenCalled();
    });

    it('reopen logs REOPENED activity', async () => {
      const existing = { ...mockCreatedAlert, status: 'RESOLVED' };
      const updated = {
        ...existing,
        status: 'OPEN',
        acknowledgedAt: null,
        acknowledgedByUserId: null,
        resolvedAt: null,
        resolvedByUserId: null,
        resolutionNote: null,
      };
      repo.findById.mockResolvedValue(existing as never);
      repo.update.mockResolvedValue(updated as never);

      await service.reopen(mockCtx, 'alert-1');

      expect(activities.logReopened).toHaveBeenCalledWith(
        mockOrgId,
        'alert-1',
        'user-1',
        expect.anything(),
      );
    });

    it('reopen mutation + activity insert are atomic', async () => {
      const existing = { ...mockCreatedAlert, status: 'RESOLVED' };
      const updated = {
        ...existing,
        status: 'OPEN',
        acknowledgedAt: null,
        acknowledgedByUserId: null,
        resolvedAt: null,
        resolvedByUserId: null,
        resolutionNote: null,
      };
      repo.findById.mockResolvedValue(existing as never);
      const callOrder: string[] = [];
      repo.update.mockImplementation(async (...args) => {
        callOrder.push('update');
        return updated as never;
      });
      activities.logReopened.mockImplementation(async (...args) => {
        callOrder.push('logReopened');
        return undefined as never;
      });

      await service.reopen(mockCtx, 'alert-1');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(callOrder).toEqual(['update', 'logReopened']);
    });

    it('tenant isolation preserved', async () => {
      const existing = { ...mockCreatedAlert, status: 'RESOLVED' };
      const updated = {
        ...existing,
        status: 'OPEN',
        acknowledgedAt: null,
        acknowledgedByUserId: null,
        resolvedAt: null,
        resolvedByUserId: null,
        resolutionNote: null,
      };
      repo.findById.mockResolvedValue(existing as never);
      repo.update.mockResolvedValue(updated as never);

      const ctx = { organizationId: 'org-tenant-xyz', userId: 'u1' };
      await service.reopen(ctx, 'alert-1');

      expect(repo.update).toHaveBeenCalledWith(
        'org-tenant-xyz',
        'alert-1',
        expect.any(Object),
        expect.anything(),
      );
      expect(activities.logReopened).toHaveBeenCalledWith(
        'org-tenant-xyz',
        'alert-1',
        'u1',
        expect.anything(),
      );
    });
  });

  describe('listActivities', () => {
    it('delegates to activities service', async () => {
      const mockActivities = [{ id: 'act-1', type: 'CREATED', createdAt: '2025-03-18T10:00:00Z' }];
      activities.listForAlert.mockResolvedValue(mockActivities as never);

      const result = await service.listActivities({ organizationId: mockOrgId }, 'alert-1');

      expect(result).toEqual(mockActivities);
      expect(activities.listForAlert).toHaveBeenCalledWith(mockOrgId, 'alert-1');
    });
  });
});
