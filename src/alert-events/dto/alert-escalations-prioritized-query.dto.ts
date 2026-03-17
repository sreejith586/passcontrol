import {
  IsUUID,
  IsOptional,
  IsIn,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AlertEscalationsPrioritizedQueryDto {
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

  @ApiPropertyOptional({ default: 25, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;
}
