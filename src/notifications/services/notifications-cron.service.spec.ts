import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsCronService } from './notifications-cron.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { ChecklistSchedulesRepository } from '../../checklists/schedules/repositories/checklist-schedules.repository';

describe('NotificationsCronService', () => {
  let service: NotificationsCronService;
  let findManyMock: jest.Mock;
  let notifications: jest.Mocked<Pick<NotificationsService, 'createNotification'>>;
  let scheduleWatchersRepo: jest.Mocked<Pick<ChecklistSchedulesRepository, 'getWatcherUserIdsByScheduleIds'>>;

  beforeEach(async () => {
    findManyMock = jest.fn().mockResolvedValue([]);

    notifications = {
      createNotification: jest.fn().mockResolvedValue(undefined),
    };

    scheduleWatchersRepo = {
      getWatcherUserIdsByScheduleIds: jest.fn().mockResolvedValue(new Map()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsCronService,
        {
          provide: PrismaService,
          useValue: { checklistRun: { findMany: findManyMock } },
        },
        { provide: NotificationsService, useValue: notifications },
        { provide: ChecklistSchedulesRepository, useValue: scheduleWatchersRepo },
      ],
    }).compile();

    service = module.get(NotificationsCronService);
  });

  describe('processDueSoon', () => {
    it('queries runs with dueAt in next 30 min and status PENDING or IN_PROGRESS', async () => {
      await service.processDueSoon();

      expect(findManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            dueAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
            status: { in: ['PENDING', 'IN_PROGRESS'] },
          },
          take: 500,
        }),
      );
    });

    it('notifies assignee only (no watchers) for due soon runs', async () => {
      const run = {
        id: 'run-1',
        organizationId: 'org-1',
        dueAt: new Date(),
        templateNameSnapshot: 'Daily Checklist',
        assignedToUserId: 'user-1',
        checklistScheduleId: 'sched-1',
      };
      findManyMock.mockResolvedValue([run]);

      await service.processDueSoon();

      expect(notifications.createNotification).toHaveBeenCalledTimes(1);
      expect(notifications.createNotification).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({
          type: 'CHECKLIST_DUE_SOON',
          userIds: ['user-1'],
          sourceType: 'CHECKLIST_RUN',
          sourceId: 'run-1',
          dedupeKey: 'CHECKLIST_DUE_SOON:run-1:user-1',
          payload: expect.objectContaining({
            runId: 'run-1',
            scheduleName: 'Daily Checklist',
          }),
        }),
      );
      expect(scheduleWatchersRepo.getWatcherUserIdsByScheduleIds).not.toHaveBeenCalled();
    });
  });

  describe('processOverdue', () => {
    it('queries runs with dueAt < now and status PENDING or IN_PROGRESS', async () => {
      await service.processOverdue();

      expect(findManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            dueAt: { lt: expect.any(Date) },
            status: { in: ['PENDING', 'IN_PROGRESS'] },
          },
          take: 500,
        }),
      );
    });

    it('notifies assignee and watchers for overdue runs', async () => {
      const run = {
        id: 'run-2',
        organizationId: 'org-2',
        dueAt: new Date(Date.now() - 60000),
        templateNameSnapshot: 'Opening',
        assignedToUserId: 'user-2',
        checklistScheduleId: 'sched-2',
      };
      findManyMock.mockResolvedValue([run]);
      scheduleWatchersRepo.getWatcherUserIdsByScheduleIds.mockResolvedValue(
        new Map([['sched-2', ['user-3']]]),
      );

      await service.processOverdue();

      expect(scheduleWatchersRepo.getWatcherUserIdsByScheduleIds).toHaveBeenCalledWith(
        'org-2',
        ['sched-2'],
      );
      expect(notifications.createNotification).toHaveBeenCalledTimes(2); // user-2, user-3
    });
  });
});
