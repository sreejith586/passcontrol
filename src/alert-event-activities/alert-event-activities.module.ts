import { Module, forwardRef } from '@nestjs/common';
import { AlertEventActivitiesRepository } from './repositories/alert-event-activities.repository';
import { AlertEventActivitiesService } from './services/alert-event-activities.service';
import { AlertEventsModule } from '../alert-events/alert-events.module';

@Module({
  imports: [forwardRef(() => AlertEventsModule)],
  providers: [AlertEventActivitiesRepository, AlertEventActivitiesService],
  exports: [AlertEventActivitiesService, AlertEventActivitiesRepository],
})
export class AlertEventActivitiesModule {}
