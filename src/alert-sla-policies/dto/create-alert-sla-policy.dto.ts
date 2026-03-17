import {
  IsUUID,
  IsOptional,
  IsString,
  IsInt,
  IsBoolean,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAlertSlaPolicyDto {
  @ApiProperty({ description: 'Severity (e.g. CRITICAL, HIGH, MEDIUM, LOW)' })
  @IsString()
  severity: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Optional brand scope' })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Optional location scope' })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiProperty({ description: 'Minutes within which alert must be acknowledged' })
  @IsInt()
  @Min(1)
  acknowledgeWithinMinutes: number;

  @ApiProperty({ description: 'Minutes within which alert must be resolved' })
  @IsInt()
  @Min(1)
  resolveWithinMinutes: number;

  @ApiPropertyOptional({ default: true, description: 'Whether policy is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
