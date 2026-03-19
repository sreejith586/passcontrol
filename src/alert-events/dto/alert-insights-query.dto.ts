import { IsOptional, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AlertInsightsSlaComplianceQueryDto {
  @ApiPropertyOptional({
    example: '2025-03-01',
    description: 'Filter from date (inclusive). Applied to triggeredAt.',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2025-03-15',
    description: 'Filter to date (inclusive). Applied to triggeredAt.',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class AlertInsightsEscalationTrendQueryDto {
  @ApiPropertyOptional({
    default: 7,
    description: 'Number of days to include. Default 7.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  days?: number = 7;
}

export class AlertInsightsTopSourcesQueryDto {
  @ApiPropertyOptional({
    default: 5,
    description: 'Maximum number of sources to return. Default 5.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 5;
}
