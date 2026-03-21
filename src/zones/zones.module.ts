import { Module } from '@nestjs/common';
import { InfraModule } from '../infra/infra.module';
import { AccessModule } from '../access/access.module';
import { AuditModule } from '../audit/audit.module';
import { LocationsModule } from '../locations/locations.module';
import { ZonesController } from './controllers/zones.controller';
import { ZonesService } from './services/zones.service';
import { ZonesRepository } from './repositories/zones.repository';

@Module({
  imports: [InfraModule, AccessModule, AuditModule, LocationsModule],
  controllers: [ZonesController],
  providers: [ZonesService, ZonesRepository],
  exports: [ZonesService, ZonesRepository],
})
export class ZonesModule {}
