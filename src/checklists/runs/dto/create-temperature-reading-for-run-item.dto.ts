import {
  IsOptional,
  IsNumber,
  IsString,
  IsEnum,
  IsObject,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TemperatureSourceType } from '../../../temperature/enums/source-type.enum';

export class CreateTemperatureReadingForRunItemDto {
  @ApiProperty({ example: 4.5, description: 'Temperature value' })
  @IsNumber()
  readingValue: number;

  @ApiProperty({ example: 'CELSIUS', description: 'Unit (e.g. CELSIUS, FAHRENHEIT)' })
  @IsString()
  unit: string;

  @ApiPropertyOptional({ enum: TemperatureSourceType, default: TemperatureSourceType.MANUAL })
  @IsOptional()
  @IsEnum(TemperatureSourceType)
  sourceType?: TemperatureSourceType;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  policyId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  recordedAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  rawPayloadJson?: Record<string, unknown>;
}
