import { IsUUID, IsOptional, IsIn, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AlertSlaComplianceQueryDto {
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
    enum: ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'],
    description: 'Filter by status. By default all statuses included.',
  })
  @IsOptional()
  @IsIn(['OPEN', 'ACKNOWLEDGED', 'RESOLVED'])
  status?: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

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
}
