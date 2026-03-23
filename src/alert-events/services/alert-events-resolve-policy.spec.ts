import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AlertEventsService } from './alert-events.service';
import { AlertEventsRepository } from '../repositories/alert-events.repository';
import { AlertSlaResolverService } from './alert-sla-resolver.service';
import { AlertEventActivitiesService } from '../../alert-event-activities/services/alert-event-activities.service';
import { AlertEventCommentsRepository } from '../../alert-event-comments/repositories/alert-event-comments.repository';
import { AuditLogsService } from '../../audit/services/audit-logs.service';
import { UsersService } from '../../users/services/users.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { ChecklistSchedulesRepository } from '../../checklists/schedules/repositories/checklist-schedules.repository';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { DOMAIN_EVENT_PUBLISHER } from '../../common/domain-events/contracts/domain-event-publisher.interface';

describe('AlertEventsService (resolve policy)', () => {
  let service: AlertEventsService;
  let repo: jest.Mocked<AlertEventsRepository>;
  let prisma: {
    $transaction: jest.Mock;
    organization: { findUnique: jest.Mock };
  };

  const orgA = 'org-a';
  const orgB = 'org-b';
  const mockAlert = {
    id: 'alert-1',
    organizationId: orgA,
    status: 'ACKNOWLEDGED',
    sourceType: 'CHECKLIST_RUN_ITEM',
    sourceId: 'item-1',
    acknowledgedAt: new Date(),
    resolvedAt: null,
    assignedToUserId: null,
  };
  const mockResolved = {
    ...mockAlert,
    status: 'RESOLVED',
    resolvedAt: new Date(),
    resolutionNote: 'Fixed',
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({}),
      ),
      organization: {
        findUnique: jest.fn().mockResolvedValue({
          requireResolutionNoteOnResolve: false,
          requireReopenNoteOnReopen: false,
        }),
      },
    };

    const mockRepo = {
      findById: jest.fn().mockResolvedValue(mockAlert),
      update: jest.fn().mockResolvedValue(mockResolved),
      assign: jest.fn(),
      unassign: jest.fn(),
      list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      listEscalations: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      listPrioritizedEscalations: jest.fn().mockResolvedValue([]),
    };

    const activities = {
      logCreated: jest.fn().mockResolvedValue(undefined),
      logAcknowledged: jest.fn().mockResolvedValue(undefined),
      logResolved: jest.fn().mockResolvedValue(undefined),
      logReopened: jest.fn().mockResolvedValue(undefined),
      logAssignmentChanged: jest.fn().mockResolvedValue(undefined),
      listForAlert: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertEventsService,
        { provide: AlertEventsRepository, useValue: mockRepo },
        {
          provide: AlertSlaResolverService,
          useValue: { resolve: jest.fn().mockResolvedValue({}) },
        },
        { provide: AlertEventActivitiesService, useValue: activities },
        {
          provide: AlertEventCommentsRepository,
          useValue: { create: jest.fn(), findByAlertId: jest.fn().mockResolvedValue([]) },
        },
        { provide: AuditLogsService, useValue: { recordWrite: jest.fn() } },
        { provide: UsersService, useValue: { belongsToOrganization: jest.fn().mockResolvedValue(true) } },
        { provide: NotificationsService, useValue: { createNotification: jest.fn() } },
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
  });

  describe('requireResolutionNoteOnResolve = false', () => {
    it('resolve succeeds without note when policy disabled', async () => {
      repo.findById.mockResolvedValue(mockAlert as never);
      repo.update.mockResolvedValue(mockResolved as never);

      const result = await service.resolve(
        { organizationId: orgA, userId: 'user-1' },
        'alert-1',
      );

      expect(result).toBeDefined();
      expect(result?.status).toBe('RESOLVED');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('requireResolutionNoteOnResolve = true', () => {
    beforeEach(() => {
      prisma.organization.findUnique.mockResolvedValue({
        requireResolutionNoteOnResolve: true,
      });
    });

    it('resolve fails without note when policy enabled', async () => {
      repo.findById.mockResolvedValue(mockAlert as never);

      await expect(
        service.resolve(
          { organizationId: orgA, userId: 'user-1' },
          'alert-1',
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.resolve(
          { organizationId: orgA, userId: 'user-1' },
          'alert-1',
          undefined,
        ),
      ).rejects.toThrow('Resolution note is required');

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('resolve fails with whitespace-only note when policy enabled', async () => {
      repo.findById.mockResolvedValue(mockAlert as never);

      await expect(
        service.resolve(
          { organizationId: orgA, userId: 'user-1' },
          'alert-1',
          '   ',
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.resolve(
          { organizationId: orgA, userId: 'user-1' },
          'alert-1',
          '\t\n  ',
        ),
      ).rejects.toThrow('Resolution note is required');

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('resolve succeeds with trimmed note when policy enabled', async () => {
      repo.findById.mockResolvedValue(mockAlert as never);
      repo.update.mockResolvedValue({
        ...mockResolved,
        resolutionNote: 'Fixed',
      } as never);

      const result = await service.resolve(
        { organizationId: orgA, userId: 'user-1' },
        'alert-1',
        '  Fixed  ',
      );

      expect(result).toBeDefined();
      expect(result?.status).toBe('RESOLVED');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(repo.update).toHaveBeenCalledWith(
        orgA,
        'alert-1',
        expect.objectContaining({
          resolutionNote: 'Fixed',
        }),
        expect.anything(),
      );
    });
  });

  describe('tenant isolation', () => {
    it('respects org context when fetching policy (org A vs org B)', async () => {
      prisma.organization.findUnique.mockImplementation(
        async (args: { where: { id: string } }) => {
          if (args.where.id === orgA) {
            return { requireResolutionNoteOnResolve: true };
          }
          return { requireResolutionNoteOnResolve: false };
        },
      );

      repo.findById.mockImplementation(async (_orgId: string, id: string) => {
        if (id === 'alert-1') {
          return { ...mockAlert, organizationId: orgA } as never;
        }
        return { ...mockAlert, id: 'alert-2', organizationId: orgB } as never;
      });
      repo.update.mockResolvedValue(mockResolved as never);

      await expect(
        service.resolve({ organizationId: orgA, userId: 'user-1' }, 'alert-1'),
      ).rejects.toThrow('Resolution note is required');

      const result = await service.resolve(
        { organizationId: orgB, userId: 'user-1' },
        'alert-2',
      );

      expect(result).toBeDefined();
      expect(prisma.organization.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: orgB },
        }),
      );
    });
  });
});
