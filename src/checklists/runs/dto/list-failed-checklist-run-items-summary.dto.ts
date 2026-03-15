import {
  IsUUID,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ChecklistItemSeverity } from '../../enums/checklist-item-severity.enum';

export class ListFailedChecklistRunItemsSummaryQueryDto {
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
      'Filter from date (inclusive). Uses parent run dueAt when present, otherwise createdAt.',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2025-03-15',
    description:
      'Filter to date (inclusive). Uses parent run dueAt when present, otherwise createdAt.',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
