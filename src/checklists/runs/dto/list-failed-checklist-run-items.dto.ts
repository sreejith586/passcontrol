import {
  IsUUID,
  IsOptional,
  IsInt,
  IsEnum,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ChecklistItemSeverity } from '../../enums/checklist-item-severity.enum';

export class ListFailedChecklistRunItemsQueryDto {
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

  @ApiPropertyOptional({ type: Number, example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ type: Number, example: 25, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;
}
