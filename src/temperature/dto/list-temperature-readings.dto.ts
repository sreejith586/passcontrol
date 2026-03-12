import {
  IsUUID,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TemperatureSourceType } from '../enums/source-type.enum';
import { BreachType } from '../enums/breach-type.enum';

export class ListTemperatureReadingsQueryDto {
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsUUID()
  assetId?: string;

  @IsOptional()
  @IsUUID()
  policyId?: string;

  @IsOptional()
  @IsUUID()
  checklistRunId?: string;

  @IsOptional()
  @IsUUID()
  checklistRunResponseId?: string;

  @IsOptional()
  @IsEnum(TemperatureSourceType)
  sourceType?: TemperatureSourceType;

  @IsOptional()
  @Type(() => Boolean)
  isBreach?: boolean;

  @IsOptional()
  @IsEnum(BreachType)
  breachType?: BreachType;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 25;

  @IsOptional()
  sort?: 'recorded_at_asc' | 'recorded_at_desc' | 'created_at_desc';
}
