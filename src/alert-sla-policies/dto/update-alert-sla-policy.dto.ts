import {
  IsUUID,
  IsOptional,
  IsString,
  IsInt,
  IsBoolean,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAlertSlaPolicyDto {
  @ApiPropertyOptional({ description: 'Severity (e.g. CRITICAL, HIGH, MEDIUM, LOW)' })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Optional brand scope' })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Optional location scope' })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({ description: 'Minutes within which alert must be acknowledged' })
  @IsOptional()
  @IsInt()
  @Min(1)
  acknowledgeWithinMinutes?: number;

  @ApiPropertyOptional({ description: 'Minutes within which alert must be resolved' })
  @IsOptional()
  @IsInt()
  @Min(1)
  resolveWithinMinutes?: number;

  @ApiPropertyOptional({ description: 'Whether policy is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
