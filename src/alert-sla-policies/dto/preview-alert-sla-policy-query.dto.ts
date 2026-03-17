import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PreviewAlertSlaPolicyQueryDto {
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
}
