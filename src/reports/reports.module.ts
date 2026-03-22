import { Module } from '@nestjs/common';
import { ChecklistRunsModule } from '../checklists/runs/checklist-runs.module';
import { ReportsController } from './controllers/reports.controller';
import { ReportsService } from './services/reports.service';
import { ReportsExcelService } from './services/reports-excel.service';

@Module({
  imports: [ChecklistRunsModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsExcelService],
})
export class ReportsModule {}
