import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { ChecklistSchedulesRepository } from '../../checklists/schedules/repositories/checklist-schedules.repository';

const CRON_EVERY_15_MINUTES = '0 */15 * * * *';
const DUE_SOON_WINDOW_MINUTES = 30;
const BATCH_LIMIT = 500;

@Injectable()
export class NotificationsCronService {
  private readonly logger = new Logger(NotificationsCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly scheduleWatchersRepo: ChecklistSchedulesRepository,
  ) {}

  @Cron(CRON_EVERY_15_MINUTES)
  async handleChecklistNotifications(): Promise<void> {
    this.logger.debug('Cron tick started: checklist notifications');
    try {
      await this.processDueSoon();
      await this.processOverdue();
      this.logger.debug('Cron tick completed: checklist notifications');
    } catch (err) {
      this.logger.error(
        `Cron tick failed: checklist notifications - ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
    }
  }

  /**
   * Notify assignee for runs due in the next 30 minutes.
   * V1: assignee only (watchers skipped per recommendation).
   */
  async processDueSoon(): Promise<void> {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + DUE_SOON_WINDOW_MINUTES * 60 * 1000);

    const runs = await this.prisma.checklistRun.findMany({
      where: {
        dueAt: { gte: now, lte: windowEnd },
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      select: {
        id: true,
        organizationId: true,
        dueAt: true,
        templateNameSnapshot: true,
        assignedToUserId: true,
        checklistScheduleId: true,
      },
      take: BATCH_LIMIT,
      orderBy: { dueAt: 'asc' },
    });

    await this.sendRunNotifications(runs, 'CHECKLIST_DUE_SOON', false);
  }

  /**
   * Notify assignee + watchers for overdue runs.
   */
  async processOverdue(): Promise<void> {
    const now = new Date();

    const runs = await this.prisma.checklistRun.findMany({
      where: {
        dueAt: { lt: now },
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      select: {
        id: true,
        organizationId: true,
        dueAt: true,
        templateNameSnapshot: true,
        assignedToUserId: true,
        checklistScheduleId: true,
      },
      take: BATCH_LIMIT,
      orderBy: { dueAt: 'asc' },
    });

    await this.sendRunNotifications(runs, 'CHECKLIST_OVERDUE', true);
  }

  private async sendRunNotifications(
    runs: Array<{
      id: string;
      organizationId: string;
      dueAt: Date | null;
      templateNameSnapshot: string;
      assignedToUserId: string | null;
      checklistScheduleId: string | null;
    }>,
    type: 'CHECKLIST_DUE_SOON' | 'CHECKLIST_OVERDUE',
    includeWatchers: boolean,
  ): Promise<void> {
    if (runs.length === 0) return;

    const runsByOrg = new Map<string, typeof runs>();
    for (const run of runs) {
      const list = runsByOrg.get(run.organizationId) ?? [];
      list.push(run);
      runsByOrg.set(run.organizationId, list);
    }

    for (const [organizationId, orgRuns] of runsByOrg) {
      const scheduleIds = orgRuns
        .map((r) => r.checklistScheduleId)
        .filter((id): id is string => id != null);
      const watchersMap = includeWatchers
        ? await this.scheduleWatchersRepo.getWatcherUserIdsByScheduleIds(
            organizationId,
            scheduleIds,
          )
        : new Map<string, string[]>();

      const dedupePrefix = type === 'CHECKLIST_DUE_SOON' ? 'CHECKLIST_DUE_SOON' : 'CHECKLIST_OVERDUE';

      for (const run of orgRuns) {
        const recipientIds = new Set<string>();
        if (run.assignedToUserId) recipientIds.add(run.assignedToUserId);
        if (includeWatchers && run.checklistScheduleId) {
          const watcherIds = watchersMap.get(run.checklistScheduleId) ?? [];
          watcherIds.forEach((id) => recipientIds.add(id));
        }

        const payload = {
          runId: run.id,
          scheduleName: run.templateNameSnapshot,
          dueAt: run.dueAt?.toISOString() ?? null,
        };

        for (const userId of recipientIds) {
          await this.notifications.createNotification(organizationId, {
            type,
            userIds: [userId],
            sourceType: 'CHECKLIST_RUN',
            sourceId: run.id,
            payload,
            dedupeKey: `${dedupePrefix}:${run.id}:${userId}`,
          });
        }
      }
    }
  }
}
