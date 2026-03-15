import { Injectable, Logger } from '@nestjs/common';
import { ChecklistSchedulesRepository } from '../repositories/checklist-schedules.repository';
import { ChecklistSchedulesService } from './checklist-schedules.service';
import { ChecklistScheduleRecurrenceService } from './checklist-schedule-recurrence.service';

const BATCH_LIMIT = 100;
const TRANSIENT_ERROR_BACKOFF_MINUTES = 5;
const TEMPLATE_NOT_PUBLISHED_BACKOFF_MINUTES = 15;

@Injectable()
export class ChecklistScheduleRunGeneratorService {
  private readonly logger = new Logger(ChecklistScheduleRunGeneratorService.name);
  private isProcessing = false;

  constructor(
    private readonly repo: ChecklistSchedulesRepository,
    private readonly schedulesService: ChecklistSchedulesService,
    private readonly recurrence: ChecklistScheduleRecurrenceService,
  ) {}

  /**
   * Process due schedules and generate runs. Called by cron.
   *
   * Generation status tracking:
   * - SUCCESS: run created, nextRunAt updated
   * - DUPLICATE_SKIPPED: run exists for same day, nextRunAt advanced
   * - TEMPLATE_NOT_FOUND: template missing, schedule deactivated
   * - TEMPLATE_NOT_PUBLISHED: template not published, retried next tick
   * - SCHEDULE_ENDED: endsAt passed or recurrence returned null, schedule deactivated
   * - TRANSIENT_ERROR: unexpected error, schedule stays active for retry
   */
  async processDueSchedules(): Promise<void> {
    if (this.isProcessing) {
      this.logger.warn({
        msg: 'Skipping overlapping cron tick',
        reason: 'previous processDueSchedules still running',
      });
      return;
    }

    this.isProcessing = true;
    const now = new Date();
    try {
      const dueSchedules = await this.repo.findDueSchedules(now, BATCH_LIMIT);

      this.logger.log({
        msg: 'Cron tick started',
        dueCount: dueSchedules.length,
        batchLimit: BATCH_LIMIT,
      });

      for (const schedule of dueSchedules) {
        try {
          const result = await this.schedulesService.generateRunCore(
            schedule.organizationId,
            schedule.id,
            schedule.nextRunAt ?? undefined,
            'ANY_SAME_DAY',
          );

          if ('skipped' in result) {
            const reason = result.skipped as
              | 'duplicate'
              | 'template_not_found'
              | 'template_not_published'
              | 'schedule_ended';
            await this.handleSkipped(schedule, reason, now);
            continue;
          }

          const run = result.run!;
          const referenceDate = run.dueAt ?? schedule.nextRunAt ?? now;
          const nextRunAt = this.recurrence.computeNextRunAt(
            {
              rrule: schedule.rrule,
              timezone: schedule.timezone,
              startsAt: schedule.startsAt,
              endsAt: schedule.endsAt,
            },
            referenceDate,
            { inclusive: false },
          );

          if (nextRunAt === null) {
            await this.repo.updateGenerationStatus(
              schedule.organizationId,
              schedule.id,
              'SCHEDULE_ENDED',
            );
            await this.repo.updateNextGenerationAttemptAt(
              schedule.organizationId,
              schedule.id,
              null,
            );
            await this.repo.deactivate(schedule.organizationId, schedule.id);
            this.logger.log({
              msg: 'Schedule ended',
              scheduleId: schedule.id,
              scheduleName: schedule.name,
              organizationId: schedule.organizationId,
              runId: run.id,
            });
          } else {
            await this.repo.updateNextRunAt(
              schedule.organizationId,
              schedule.id,
              nextRunAt,
            );
            await this.repo.updateGenerationStatus(
              schedule.organizationId,
              schedule.id,
              'SUCCESS',
            );
            await this.repo.updateNextGenerationAttemptAt(
              schedule.organizationId,
              schedule.id,
              null,
            );
            this.logger.log({
              msg: 'Run generated',
              runId: run.id,
              scheduleId: schedule.id,
              scheduleName: schedule.name,
              organizationId: schedule.organizationId,
            });
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          await this.repo.updateGenerationStatus(
            schedule.organizationId,
            schedule.id,
            'TRANSIENT_ERROR',
            errorMsg,
          );
          const backoffUntil = new Date(
            now.getTime() + TRANSIENT_ERROR_BACKOFF_MINUTES * 60 * 1000,
          );
          await this.repo.updateNextGenerationAttemptAt(
            schedule.organizationId,
            schedule.id,
            backoffUntil,
          );
          this.logger.error({
            msg: 'Transient error',
            scheduleId: schedule.id,
            scheduleName: schedule.name,
            organizationId: schedule.organizationId,
            error: errorMsg,
          });
          if (err instanceof Error && err.stack) {
            this.logger.debug(err.stack);
          }
        }
      }

      this.logger.log({
        msg: 'Cron tick completed',
        processedCount: dueSchedules.length,
      });
    } finally {
      this.isProcessing = false;
    }
  }

  private async handleSkipped(
    schedule: {
      id: string;
      organizationId: string;
      name: string;
      rrule: string;
      timezone: string;
      startsAt: Date | null;
      endsAt: Date | null;
      nextRunAt: Date | null;
    },
    reason:
      | 'duplicate'
      | 'template_not_found'
      | 'template_not_published'
      | 'schedule_ended',
    now: Date,
  ): Promise<void> {
    const ctx = {
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      organizationId: schedule.organizationId,
    };

    switch (reason) {
      case 'duplicate':
        await this.repo.updateGenerationStatus(
          schedule.organizationId,
          schedule.id,
          'DUPLICATE_SKIPPED',
        );
        await this.repo.updateNextGenerationAttemptAt(
          schedule.organizationId,
          schedule.id,
          null,
        );
        await this.advanceNextRunAt(schedule, now);
        this.logger.debug({
          msg: 'Duplicate skipped',
          ...ctx,
        });
        break;

      case 'template_not_found':
        await this.repo.updateGenerationStatus(
          schedule.organizationId,
          schedule.id,
          'TEMPLATE_NOT_FOUND',
        );
        await this.repo.updateNextGenerationAttemptAt(
          schedule.organizationId,
          schedule.id,
          null,
        );
        await this.repo.deactivate(schedule.organizationId, schedule.id);
        this.logger.error({
          msg: 'Template missing',
          ...ctx,
        });
        break;

      case 'template_not_published':
        await this.repo.updateGenerationStatus(
          schedule.organizationId,
          schedule.id,
          'TEMPLATE_NOT_PUBLISHED',
        );
        const templateBackoffUntil = new Date(
          now.getTime() +
            TEMPLATE_NOT_PUBLISHED_BACKOFF_MINUTES * 60 * 1000,
        );
        await this.repo.updateNextGenerationAttemptAt(
          schedule.organizationId,
          schedule.id,
          templateBackoffUntil,
        );
        this.logger.warn({
          msg: 'Skipped: template unpublished, will retry',
          ...ctx,
        });
        break;

      case 'schedule_ended':
        await this.repo.updateGenerationStatus(
          schedule.organizationId,
          schedule.id,
          'SCHEDULE_ENDED',
        );
        await this.repo.updateNextGenerationAttemptAt(
          schedule.organizationId,
          schedule.id,
          null,
        );
        await this.repo.deactivate(schedule.organizationId, schedule.id);
        this.logger.log({
          msg: 'Schedule ended',
          ...ctx,
        });
        break;
    }
  }

  private async advanceNextRunAt(
    schedule: {
      id: string;
      organizationId: string;
      rrule: string;
      timezone: string;
      startsAt: Date | null;
      endsAt: Date | null;
      nextRunAt: Date | null;
    },
    now: Date,
  ): Promise<void> {
    const referenceDate = schedule.nextRunAt ?? now;
    const nextRunAt = this.recurrence.computeNextRunAt(
      {
        rrule: schedule.rrule,
        timezone: schedule.timezone,
        startsAt: schedule.startsAt,
        endsAt: schedule.endsAt,
      },
      referenceDate,
      { inclusive: false },
    );
    await this.repo.updateNextRunAt(
      schedule.organizationId,
      schedule.id,
      nextRunAt,
    );
  }
}
