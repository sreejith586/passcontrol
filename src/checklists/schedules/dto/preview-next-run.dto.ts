import { IsString, IsOptional, IsDateString, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PreviewNextRunDto {
  @ApiProperty({
    example: 'FREQ=DAILY;BYHOUR=6;BYMINUTE=0',
    description: 'iCal RRULE string',
  })
  @IsString()
  @IsNotEmpty()
  rrule: string;

  @ApiProperty({ example: 'America/New_York', description: 'IANA timezone' })
  @IsString()
  @IsNotEmpty()
  timezone: string;

  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', format: 'date-time' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ example: '2025-12-31T23:59:59Z', format: 'date-time' })
  @IsOptional()
  @IsDateString()
  endsAt?: string;
}
