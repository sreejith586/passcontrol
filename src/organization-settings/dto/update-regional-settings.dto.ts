import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRegionalSettingsDto {
  @ApiPropertyOptional({
    example: 'America/New_York',
    description: 'Organization default timezone (IANA)',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(63)
  defaultTimezone?: string | null;

  @ApiPropertyOptional({
    enum: ['F', 'C'],
    description: 'Organization default temperature unit',
    nullable: true,
  })
  @IsOptional()
  @IsIn(['F', 'C'], {
    message: 'defaultTemperatureUnit must be F or C',
  })
  defaultTemperatureUnit?: 'F' | 'C' | null;
}
