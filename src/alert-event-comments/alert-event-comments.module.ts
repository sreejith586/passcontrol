import { Module, forwardRef } from '@nestjs/common';
import { AlertEventCommentsRepository } from './repositories/alert-event-comments.repository';
import { AlertEventCommentsService } from './services/alert-event-comments.service';
import { AlertEventsModule } from '../alert-events/alert-events.module';

@Module({
  imports: [forwardRef(() => AlertEventsModule)],
  providers: [AlertEventCommentsRepository, AlertEventCommentsService],
  exports: [AlertEventCommentsService, AlertEventCommentsRepository],
})
export class AlertEventCommentsModule {}
