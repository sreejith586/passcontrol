import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AlertEventsService } from './alert-events.service';
import { AlertEventsRepository } from '../repositories/alert-events.repository';
import { AlertSlaResolverService } from './alert-sla-resolver.service';
import { AlertEventActivitiesService } from '../../alert-event-activities/services/alert-event-activities.service';
import { AlertEventCommentsRepository } from '../../alert-event-comments/repositories/alert-event-comments.repository';
import { AuditLogsService } from '../../audit/services/audit-logs.service';
import { UsersService } from '../../users/services/users.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { DOMAIN_EVENT_PUBLISHER } from '../../common/domain-events/contracts/domain-event-publisher.interface';

describe('AlertEventsService (reopen policy)', () => {
  let service: AlertEventsService;
  let repo: jest.Mocked<AlertEventsRepository>;
  let commentsRepo: jest.Mocked<AlertEventCommentsRepository>;
  let prisma: {
    $transaction: jest.Mock;
    organization: { findUnique: jest.Mock };
  };

  const orgA = 'org-a';
  const orgB = 'org-b';
  const mockResolvedAlert = {
    id: 'alert-1',
    organizationId: orgA,
    status: 'RESOLVED',
    sourceType: 'CHECKLIST_RUN_ITEM',
    sourceId: 'item-1',
    acknowledgedAt: new Date(),
    resolvedAt: new Date(),
    resolutionNote: 'Fixed',
    assignedToUserId: 'user-2',
  };
  const mockReopenedAlert = {
    ...mockResolvedAlert,
    status: 'OPEN',
    acknowledgedAt: null,
    acknowledgedByUserId: null,
    resolvedAt: null,
    resolvedByUserId: null,
    resolutionNote: null,
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
      findById: jest.fn().mockResolvedValue(mockResolvedAlert),
      update: jest.fn().mockResolvedValue(mockReopenedAlert),
    };

    const activities = {
      logReopened: jest.fn().mockResolvedValue(undefined),
    };

    commentsRepo = {
      create: jest.fn().mockResolvedValue({
        id: 'comment-1',
        type: 'REOPEN_NOTE',
        body: 'Reopened for recheck',
      }),
      findByAlertId: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<AlertEventCommentsRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertEventsService,
        { provide: AlertEventsRepository, useValue: mockRepo },
        { provide: AlertSlaResolverService, useValue: { resolve: jest.fn() } },
        { provide: AlertEventActivitiesService, useValue: activities },
        { provide: AlertEventCommentsRepository, useValue: commentsRepo },
        { provide: AuditLogsService, useValue: { recordWrite: jest.fn() } },
        { provide: UsersService, useValue: { belongsToOrganization: jest.fn().mockResolvedValue(true) } },
        { provide: PrismaService, useValue: prisma },
        { provide: DOMAIN_EVENT_PUBLISHER, useValue: { publish: jest.fn() } },
      ],
    }).compile();

    service = module.get(AlertEventsService);
    repo = module.get(AlertEventsRepository);
  });

  describe('requireReopenNoteOnReopen = false', () => {
    it('reopen succeeds without note when policy disabled', async () => {
      const result = await service.reopen(
        { organizationId: orgA, userId: 'user-1' },
        'alert-1',
      );

      expect(result).toBeDefined();
      expect(result?.status).toBe('OPEN');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(commentsRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('requireReopenNoteOnReopen = true', () => {
    beforeEach(() => {
      prisma.organization.findUnique.mockResolvedValue({
        requireResolutionNoteOnResolve: false,
        requireReopenNoteOnReopen: true,
      });
    });

    it('reopen fails without note when policy enabled', async () => {
      await expect(
        service.reopen(
          { organizationId: orgA, userId: 'user-1' },
          'alert-1',
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.reopen(
          { organizationId: orgA, userId: 'user-1' },
          'alert-1',
          undefined,
        ),
      ).rejects.toThrow('Reopen note is required');

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('reopen fails with whitespace-only note when policy enabled', async () => {
      await expect(
        service.reopen(
          { organizationId: orgA, userId: 'user-1' },
          'alert-1',
          '   ',
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.reopen(
          { organizationId: orgA, userId: 'user-1' },
          'alert-1',
          '\t\n  ',
        ),
      ).rejects.toThrow('Reopen note is required');

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('reopen succeeds with trimmed note when policy enabled', async () => {
      const result = await service.reopen(
        { organizationId: orgA, userId: 'user-1' },
        'alert-1',
        '  Reopened for recheck  ',
      );

      expect(result).toBeDefined();
      expect(result?.status).toBe('OPEN');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(commentsRepo.create).toHaveBeenCalledWith(
        {
          organizationId: orgA,
          alertEventId: 'alert-1',
          authorUserId: 'user-1',
          type: 'REOPEN_NOTE',
          body: 'Reopened for recheck',
        },
        expect.anything(),
      );
    });
  });

  describe('REOPEN_NOTE comment', () => {
    it('creates REOPEN_NOTE comment when note provided and policy disabled', async () => {
      await service.reopen(
        { organizationId: orgA, userId: 'user-1' },
        'alert-1',
        'Reopened for recheck',
      );

      expect(commentsRepo.create).toHaveBeenCalledWith(
        {
          organizationId: orgA,
          alertEventId: 'alert-1',
          authorUserId: 'user-1',
          type: 'REOPEN_NOTE',
          body: 'Reopened for recheck',
        },
        expect.anything(),
      );
    });

    it('reopen with note and no userId succeeds and stores null author', async () => {
      const result = await service.reopen(
        { organizationId: orgA },
        'alert-1',
        'Reopened for recheck',
      );

      expect(result).toBeDefined();
      expect(result?.status).toBe('OPEN');
      expect(commentsRepo.create).toHaveBeenCalledWith(
        {
          organizationId: orgA,
          alertEventId: 'alert-1',
          authorUserId: null,
          type: 'REOPEN_NOTE',
          body: 'Reopened for recheck',
        },
        expect.anything(),
      );
    });
  });

  describe('transaction atomicity', () => {
    it('reopen mutation + activity + comment insert are atomic', async () => {
      const callOrder: string[] = [];
      repo.update.mockImplementation(async (...args) => {
        callOrder.push('update');
        return mockReopenedAlert as never;
      });
      const activities = {
        logReopened: jest.fn().mockImplementation(async () => {
          callOrder.push('logReopened');
        }),
      };
      commentsRepo.create.mockImplementation(async () => {
        callOrder.push('commentsCreate');
        return {} as never;
      });

      const moduleRef = await Test.createTestingModule({
        providers: [
          AlertEventsService,
          { provide: AlertEventsRepository, useValue: repo },
          { provide: AlertSlaResolverService, useValue: { resolve: jest.fn() } },
          { provide: AlertEventActivitiesService, useValue: activities },
          { provide: AlertEventCommentsRepository, useValue: commentsRepo },
          { provide: AuditLogsService, useValue: { recordWrite: jest.fn() } },
          { provide: UsersService, useValue: { belongsToOrganization: jest.fn().mockResolvedValue(true) } },
          { provide: PrismaService, useValue: prisma },
          { provide: DOMAIN_EVENT_PUBLISHER, useValue: { publish: jest.fn() } },
        ],
      }).compile();
      const svc = moduleRef.get(AlertEventsService);

      await svc.reopen(
        { organizationId: orgA, userId: 'user-1' },
        'alert-1',
        'Reopened',
      );

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(callOrder).toEqual(['update', 'logReopened', 'commentsCreate']);
    });
  });

  describe('tenant isolation', () => {
    it('respects org context when fetching policy', async () => {
      prisma.organization.findUnique.mockImplementation(
        async (args: { where: { id: string } }) => {
          if (args.where.id === orgA) {
            return { requireResolutionNoteOnResolve: false, requireReopenNoteOnReopen: true };
          }
          return { requireResolutionNoteOnResolve: false, requireReopenNoteOnReopen: false };
        },
      );

      repo.findById.mockImplementation(async (_orgId: string, id: string) => {
        if (id === 'alert-1') return { ...mockResolvedAlert, organizationId: orgA } as never;
        return { ...mockResolvedAlert, id: 'alert-2', organizationId: orgB } as never;
      });

      await expect(
        service.reopen({ organizationId: orgA, userId: 'user-1' }, 'alert-1'),
      ).rejects.toThrow('Reopen note is required');

      const result = await service.reopen(
        { organizationId: orgB, userId: 'user-1' },
        'alert-2',
      );

      expect(result).toBeDefined();
      expect(prisma.organization.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: orgB } }),
      );
    });
  });
});
