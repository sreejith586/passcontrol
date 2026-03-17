import {
  IsUUID,
  IsOptional,
  IsIn,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const ALERT_ESCALATIONS_TRENDS_INTERVALS = ['day', 'week', 'month'] as const;
export type AlertEscalationsTrendsInterval =
  (typeof ALERT_ESCALATIONS_TRENDS_INTERVALS)[number];

export class AlertEscalationsTrendsQueryDto {
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
    description: 'Filter by status. Only OPEN or ACKNOWLEDGED. Default scope is both.',
  })
  @IsOptional()
  @IsIn(['OPEN', 'ACKNOWLEDGED'])
  status?: 'OPEN' | 'ACKNOWLEDGED';

  @ApiPropertyOptional({
    example: '2025-03-01',
    description: 'Filter from date (inclusive). Applied to alert createdAt.',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2025-03-15',
    description: 'Filter to date (inclusive). Applied to alert createdAt.',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    enum: ['day', 'week', 'month'],
    default: 'day',
    description: 'Time bucket interval for grouping by createdAt.',
  })
  @IsOptional()
  @IsIn(ALERT_ESCALATIONS_TRENDS_INTERVALS)
  interval?: AlertEscalationsTrendsInterval;
}
