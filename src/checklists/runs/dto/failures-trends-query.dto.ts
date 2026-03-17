import {
  IsUUID,
  IsOptional,
  IsEnum,
  IsDateString,
  IsIn,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ChecklistItemSeverity } from '../../enums/checklist-item-severity.enum';

export const FAILURES_TRENDS_INTERVALS = ['day', 'week', 'month'] as const;
export type FailuresTrendsInterval = (typeof FAILURES_TRENDS_INTERVALS)[number];

export class FailuresTrendsQueryDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Filter by brand UUID' })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filter by location UUID' })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filter by zone UUID' })
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Filter by checklist template UUID',
  })
  @IsOptional()
  @IsUUID()
  checklistTemplateId?: string;

  @ApiPropertyOptional({
    enum: ChecklistItemSeverity,
    description: 'Filter by item severity',
  })
  @IsOptional()
  @IsEnum(ChecklistItemSeverity)
  severity?: ChecklistItemSeverity;

  @ApiPropertyOptional({
    example: '2025-03-01',
    description:
      'Filter from date (inclusive). Uses run dueAt when present, otherwise createdAt.',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2025-03-15',
    description:
      'Filter to date (inclusive). Uses run dueAt when present, otherwise createdAt.',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    enum: ['day', 'week', 'month'],
    default: 'day',
    description: 'Time bucket interval for grouping.',
  })
  @IsOptional()
  @IsIn(FAILURES_TRENDS_INTERVALS)
  interval?: FailuresTrendsInterval;
}
