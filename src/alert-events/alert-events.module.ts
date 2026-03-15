import { Module } from '@nestjs/common';
import { InfraModule } from '../infra/infra.module';
import { AccessModule } from '../access/access.module';
import { AuditModule } from '../audit/audit.module';
import { AlertEventsController } from './controllers/alert-events.controller';
import { AlertEventsService } from './services/alert-events.service';
import { AlertEventsRepository } from './repositories/alert-events.repository';

@Module({
  imports: [InfraModule, AccessModule, AuditModule],
  controllers: [AlertEventsController],
  providers: [AlertEventsService, AlertEventsRepository],
  exports: [AlertEventsService, AlertEventsRepository],
})
export class AlertEventsModule {}
