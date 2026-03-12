import { Module } from '@nestjs/common';
import { InfraModule } from '../infra/infra.module';
import { AccessModule } from '../access/access.module';
import { AuditModule } from '../audit/audit.module';
import { FilesController } from './controllers/files.controller';
import { FilesService } from './services/files.service';
import { FilesRepository } from './repositories/files.repository';
import { MockStorageService } from './storage/mock-storage.service';
import { STORAGE_SERVICE } from './storage/storage.interface';

@Module({
  imports: [InfraModule, AccessModule, AuditModule],
  controllers: [FilesController],
  providers: [
    FilesService,
    FilesRepository,
    {
      provide: STORAGE_SERVICE,
      useClass: MockStorageService,
    },
  ],
  exports: [FilesService],
})
export class FilesModule {}
