import {
  IsUUID,
  IsOptional,
  IsEnum,
  IsInt,
  IsString,
  IsIn,
  Min,
  Max,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { AlertEventType } from '../enums/alert-type.enum';
import { AlertEventStatus } from '../enums/alert-status.enum';

export class ListAlertEventsQueryDto {
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

  @IsOptional()
  @IsEnum(AlertEventType)
  type?: AlertEventType;

  @IsOptional()
  @IsEnum(AlertEventStatus)
  status?: AlertEventStatus;

  @IsOptional()
  @IsString()
  severity?: string;

  @IsOptional()
  sourceType?: string;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  assignedToMe?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unassignedOnly?: boolean;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;

  @IsOptional()
  @IsIn([
    'triggered_at_asc',
    'triggered_at_desc',
    'created_at_desc',
    'status_asc',
    'status_desc',
    'severity_asc',
    'severity_desc',
    'assigned_asc',
    'assigned_desc',
  ])
  sort?:
    | 'triggered_at_asc'
    | 'triggered_at_desc'
    | 'created_at_desc'
    | 'status_asc'
    | 'status_desc'
    | 'severity_asc'
    | 'severity_desc'
    | 'assigned_asc'
    | 'assigned_desc';
}
