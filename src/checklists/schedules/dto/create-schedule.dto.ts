import { IsUUID, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateScheduleDto {
  @ApiProperty({ format: 'uuid', description: 'Published template UUID' })
  @IsUUID()
  checklistTemplateId: string;

  @ApiProperty({ example: 'Daily Opening Checklist' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'America/New_York' })
  @IsString()
  timezone: string;

  @ApiProperty({ example: 'FREQ=DAILY;BYHOUR=6;BYMINUTE=0', description: 'iCal RRULE string' })
  @IsString()
  rrule: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Owner user UUID' })
  @IsOptional()
  @IsUUID()
  ownerUserId?: string;

  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', format: 'date-time' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ example: '2025-12-31T23:59:59Z', format: 'date-time' })
  @IsOptional()
  @IsDateString()
  endsAt?: string;
}
