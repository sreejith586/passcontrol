import {
  IsUUID,
  IsOptional,
  IsDateString,
  IsIn,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const ALERT_TRENDS_INTERVALS = ['day', 'week', 'month'] as const;
export type AlertTrendsInterval = (typeof ALERT_TRENDS_INTERVALS)[number];

export class AlertTrendsQueryDto {
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
    description: 'Filter by alert severity',
  })
  @IsOptional()
  severity?: string;

  @ApiPropertyOptional({
    example: '2025-03-01',
    description:
      'Filter from date (inclusive). Applied to each lifecycle timestamp (created, acknowledged, resolved) independently.',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2025-03-15',
    description:
      'Filter to date (inclusive). Applied to each lifecycle timestamp (created, acknowledged, resolved) independently.',
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
  @IsIn(ALERT_TRENDS_INTERVALS)
  interval?: AlertTrendsInterval;
}
