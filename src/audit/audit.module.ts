import { Module } from '@nestjs/common';
import { InfraModule } from '../infra/infra.module';
import { AuditLogsService } from './services/audit-logs.service';

@Module({
  imports: [InfraModule],
  providers: [AuditLogsService],
  exports: [AuditLogsService],
})
export class AuditModule {}
