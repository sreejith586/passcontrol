import {
  IsUUID,
  IsOptional,
  IsIn,
  IsInt,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AlertEscalationsQueryDto {
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

  @ApiPropertyOptional({ description: 'Filter by alert severity' })
  @IsOptional()
  severity?: string;

  @ApiPropertyOptional({
    enum: ['OPEN', 'ACKNOWLEDGED'],
    description: 'Filter by status. Only OPEN or ACKNOWLEDGED accepted.',
  })
  @IsOptional()
  @IsIn(['OPEN', 'ACKNOWLEDGED'])
  status?: 'OPEN' | 'ACKNOWLEDGED';

  @ApiPropertyOptional({ format: 'uuid', description: 'Filter by assigned user UUID' })
  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @ApiPropertyOptional({
    description: 'If true, filter to alerts assigned to the current user.',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  assignedToMe?: boolean;

  @ApiPropertyOptional({
    description: 'If true, filter to unassigned alerts only.',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unassignedOnly?: boolean;

  @ApiPropertyOptional({
    description: 'If true, return only alerts with acknowledge or resolve breach.',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  onlyBreached?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;

  @ApiPropertyOptional({
    description:
      'Sort order. Omit or "default" for urgency-based ordering. Explicit values override default.',
    enum: [
      'default',
      'created_at_asc',
      'created_at_desc',
      'status_asc',
      'status_desc',
      'severity_asc',
      'severity_desc',
      'assigned_asc',
      'assigned_desc',
    ],
  })
  @IsOptional()
  @IsIn([
    'default',
    'created_at_asc',
    'created_at_desc',
    'status_asc',
    'status_desc',
    'severity_asc',
    'severity_desc',
    'assigned_asc',
    'assigned_desc',
  ])
  sort?:
    | 'default'
    | 'created_at_asc'
    | 'created_at_desc'
    | 'status_asc'
    | 'status_desc'
    | 'severity_asc'
    | 'severity_desc'
    | 'assigned_asc'
    | 'assigned_desc';
}
