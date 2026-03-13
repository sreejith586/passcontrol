import { IsUUID, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateScheduleDto {
  @IsUUID()
  checklistTemplateId: string;

  @IsString()
  name: string;

  @IsString()
  timezone: string;

  @IsString()
  rrule: string;

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
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}
