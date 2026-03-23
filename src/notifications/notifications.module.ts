import { Module } from '@nestjs/common';
import { InfraModule } from '../infra/infra.module';
import { AccessModule } from '../access/access.module';
import { ChecklistSchedulesModule } from '../checklists/schedules/checklist-schedules.module';
import { NotificationsRepository } from './repositories/notifications.repository';
import { NotificationsService } from './services/notifications.service';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationsCronService } from './services/notifications-cron.service';

@Module({
  imports: [InfraModule, AccessModule, ChecklistSchedulesModule],
  controllers: [NotificationsController],
  providers: [NotificationsRepository, NotificationsService, NotificationsCronService],
  exports: [NotificationsService, NotificationsRepository],
})
export class NotificationsModule {}
