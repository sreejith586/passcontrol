import { Module } from '@nestjs/common';
import { InfraModule } from '../infra/infra.module';
import { AccessModule } from '../access/access.module';
import { AuditModule } from '../audit/audit.module';
import { BrandsController } from './controllers/brands.controller';
import { BrandsService } from './services/brands.service';
import { BrandsRepository } from './repositories/brands.repository';

@Module({
  imports: [InfraModule, AccessModule, AuditModule],
  controllers: [BrandsController],
  providers: [BrandsService, BrandsRepository],
  exports: [BrandsService, BrandsRepository],
})
export class BrandsModule {}
