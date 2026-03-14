import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ChecklistScheduleRunGeneratorService } from './checklist-schedule-run-generator.service';

@Injectable()
export class ChecklistScheduleCronService {
  private readonly logger = new Logger(ChecklistScheduleCronService.name);

  constructor(
    private readonly runGenerator: ChecklistScheduleRunGeneratorService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleRunGeneration(): Promise<void> {
    this.logger.debug('Cron tick started: checklist run generation');

    try {
      await this.runGenerator.processDueSchedules();
      this.logger.debug('Cron tick completed: checklist run generation');
    } catch (err) {
      this.logger.error(
        `Cron tick failed: checklist run generation - ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
    }
  }
}
