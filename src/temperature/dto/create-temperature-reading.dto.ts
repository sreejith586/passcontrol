import {
  IsUUID,
  IsOptional,
  IsNumber,
  IsString,
  IsEnum,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TemperatureSourceType } from '../enums/source-type.enum';

export class CreateTemperatureReadingDto {
  @IsUUID()
  organizationId: string;

  @IsOptional()
  @IsUUID()
  brandId?: string;

  @IsUUID()
  locationId: string;

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

  @IsEnum(TemperatureSourceType)
  sourceType: TemperatureSourceType;

  @IsNumber()
  readingValue: number;

  @IsString()
  unit: string;

  @IsOptional()
  @Type(() => Date)
  recordedAt?: Date;

  @IsOptional()
  @IsObject()
  rawPayloadJson?: Record<string, unknown>;
}
