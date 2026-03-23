import { Module } from '@nestjs/common';
import { InfraModule } from '../infra/infra.module';
import { AccessModule } from '../access/access.module';
import { ChecklistSchedulesModule } from '../checklists/schedules/checklist-schedules.module';
import { OrganizationSettingsModule } from '../organization-settings/organization-settings.module';
import { NotificationsRepository } from './repositories/notifications.repository';
import { UserNotificationPreferenceRepository } from './repositories/user-notification-preference.repository';
import { NotificationDeliveryRepository } from './repositories/notification-delivery.repository';
import { NotificationsService } from './services/notifications.service';
import { NotificationPreferencesService } from './services/notification-preferences.service';
import { NotificationDeliveryService } from './services/notification-delivery.service';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationsCronService } from './services/notifications-cron.service';
import { MailService } from './mail/mail.service';
import { EmailChannelService } from './mail/email-channel.service';

@Module({
  imports: [InfraModule, AccessModule, ChecklistSchedulesModule, OrganizationSettingsModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsRepository,
    UserNotificationPreferenceRepository,
    NotificationDeliveryRepository,
    NotificationsService,
    NotificationPreferencesService,
    NotificationDeliveryService,
    MailService,
    EmailChannelService,
    NotificationsCronService,
  ],
  exports: [NotificationsService, NotificationsRepository, NotificationPreferencesService],
})
export class NotificationsModule {}
