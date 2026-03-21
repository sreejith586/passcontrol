import { Module } from '@nestjs/common';
import { InfraModule } from '../infra/infra.module';
import { AccessModule } from '../access/access.module';
import { AuditModule } from '../audit/audit.module';
import { ChecklistTemplatesModule } from '../checklists/templates/checklist-templates.module';
import { ChecklistSchedulesModule } from '../checklists/schedules/checklist-schedules.module';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

@Module({
  imports: [
    InfraModule,
    AccessModule,
    AuditModule,
    ChecklistTemplatesModule,
    ChecklistSchedulesModule,
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
