import { IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ChecklistRunMetricsQueryDto {
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
    example: 'America/New_York',
    description: 'Timezone for todayRuns date range (default: UTC)',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    example: '2025-03-14',
    description: 'Date for todayRuns (YYYY-MM-DD, default: today in timezone)',
  })
  @IsOptional()
  @IsString()
  date?: string;
}
