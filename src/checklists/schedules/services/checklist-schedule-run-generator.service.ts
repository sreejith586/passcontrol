import { Injectable, Logger } from '@nestjs/common';
import { ChecklistSchedulesRepository } from '../repositories/checklist-schedules.repository';
import { ChecklistSchedulesService } from './checklist-schedules.service';

const BATCH_LIMIT = 100;

@Injectable()
export class ChecklistScheduleRunGeneratorService {
  private readonly logger = new Logger(ChecklistScheduleRunGeneratorService.name);
  private isProcessing = false;

  constructor(
    private readonly repo: ChecklistSchedulesRepository,
    private readonly schedulesService: ChecklistSchedulesService,
  ) {}

  /**
   * Process due schedules and generate runs. Called by cron.
   */
  async processDueSchedules(): Promise<void> {
    if (this.isProcessing) {
      this.logger.warn(
        'Skipping overlapping cron tick: previous processDueSchedules still running',
      );
      return;
    }

    this.isProcessing = true;
    try {
      const now = new Date();
      const dueSchedules = await this.repo.findDueSchedules(now, BATCH_LIMIT);

      this.logger.log(`Found ${dueSchedules.length} due schedule(s) to process`);

      for (const schedule of dueSchedules) {
        try {
          const result = await this.schedulesService.generateRunCore(
            schedule.organizationId,
            schedule.id,
            schedule.nextRunAt ?? undefined,
            'ANY_SAME_DAY',
          );

          if ('skipped' in result) {
            if (result.skipped === 'duplicate') {
              this.logger.debug(
                `Skipped schedule ${schedule.id} (${schedule.name}): duplicate run exists for same day`,
              );
            } else if (result.skipped === 'template_not_found') {
              this.logger.warn(
                `Skipped schedule ${schedule.id} (${schedule.name}): template not found or not published`,
              );
            }
            continue;
          }

          const run = result.run!;
          this.logger.log(
            `Generated run ${run.id} for schedule ${schedule.id} (${schedule.name})`,
          );

          const nextRunAt = this.computeNextRunAt(
            schedule.nextRunAt ?? run.dueAt ?? now,
          );
          await this.repo.updateNextRunAt(
            schedule.organizationId,
            schedule.id,
            nextRunAt,
          );
        } catch (err) {
          this.logger.error(
            `Failed to generate run for schedule ${schedule.id} (${schedule.name}): ${err instanceof Error ? err.message : String(err)}`,
            err instanceof Error ? err.stack : undefined,
          );
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Compute next run time. Simple daily increment for now.
   * TODO: Use RRULE (e.g. rrule.js) with schedule.timezone for proper recurrence.
   */
  private computeNextRunAt(from: Date): Date {
    const next = new Date(from);
    next.setUTCDate(next.getUTCDate() + 1);
    return next;
  }
}
