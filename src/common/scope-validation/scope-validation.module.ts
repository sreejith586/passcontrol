import { Module } from '@nestjs/common';
import { InfraModule } from '../../infra/infra.module';
import { ScopeValidationService } from './scope-validation.service';

@Module({
  imports: [InfraModule],
  providers: [ScopeValidationService],
  exports: [ScopeValidationService],
})
export class ScopeValidationModule {}
