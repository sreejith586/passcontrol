import { Module } from '@nestjs/common';
import { InfraModule } from '../infra/infra.module';
import { RegionalSettingsResolverService } from '../common/services/regional-settings-resolver.service';

@Module({
  imports: [InfraModule],
  providers: [RegionalSettingsResolverService],
  exports: [RegionalSettingsResolverService],
})
export class RegionalSettingsModule {}
