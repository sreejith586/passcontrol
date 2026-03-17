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
}
