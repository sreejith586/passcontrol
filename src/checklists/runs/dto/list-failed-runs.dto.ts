import {
  IsUUID,
  IsOptional,
  IsInt,
  IsIn,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListFailedRunsQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filter by checklist template UUID' })
  @IsOptional()
  @IsUUID()
  checklistTemplateId?: string;

  @ApiPropertyOptional({
    example: '2025-03-01',
    description: 'Filter runs from this date (inclusive). Uses run dueAt when present, otherwise createdAt.',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2025-03-15',
    description: 'Filter runs to this date (inclusive). Uses run dueAt when present, otherwise createdAt.',
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

  @ApiPropertyOptional({
    enum: ['full', 'summary'],
    default: 'full',
    description:
      'View mode: "full" includes sectionSnapshots and itemSnapshots; "summary" returns run-level fields only for lighter payloads',
  })
  @IsOptional()
  @IsIn(['full', 'summary'])
  view?: 'full' | 'summary' = 'full';
}
