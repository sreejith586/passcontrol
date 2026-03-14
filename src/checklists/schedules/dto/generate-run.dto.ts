import { IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateRunDto {
  @ApiPropertyOptional({
    example: '2025-03-14T06:00:00Z',
    format: 'date-time',
    description: 'Optional due date/time for the run. Defaults to schedule.nextRunAt or now.',
  })
  @IsOptional()
  @IsDateString()
  dueAt?: string;
}
