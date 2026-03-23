import { Module } from '@nestjs/common';
import { InfraModule } from '../infra/infra.module';
import { AccessModule } from '../access/access.module';
import { NotificationsRepository } from './repositories/notifications.repository';
import { NotificationsService } from './services/notifications.service';
import { NotificationsController } from './controllers/notifications.controller';

@Module({
  imports: [InfraModule, AccessModule],
  controllers: [NotificationsController],
  providers: [NotificationsRepository, NotificationsService],
  exports: [NotificationsService, NotificationsRepository],
})
export class NotificationsModule {}
