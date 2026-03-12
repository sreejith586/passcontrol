import {
  IsUUID,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';

export class CreateTemperaturePolicyDto {
  @IsUUID()
  organizationId: string;

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

  @IsString()
  name: string;

  @IsNumber()
  minTemp: number;

  @IsNumber()
  maxTemp: number;

  @IsString()
  unit: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  breachGraceSeconds?: number;

  @IsBoolean()
  isActive: boolean;
}
