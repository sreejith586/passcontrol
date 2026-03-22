import {
  IsUUID,
  IsOptional,
  IsIn,
  IsString,
  IsInt,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListTodayRunsQueryDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'] })
  @IsOptional()
  @IsIn(['PENDING', 'IN_PROGRESS', 'COMPLETED'])
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

  @ApiPropertyOptional({ format: 'uuid', description: 'Filter by assigned user UUID' })
  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;

  @ApiPropertyOptional({ type: Boolean, description: 'Filter to runs assigned to current user' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  assignedToMe?: boolean;

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

  @ApiPropertyOptional({ example: 'America/New_York', description: 'Timezone for today start/end' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: '2025-03-14', description: 'Override date (YYYY-MM-DD), default: today' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ type: Number, example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ type: Number, example: 25, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;

  @ApiPropertyOptional({
    enum: ['full', 'summary'],
    default: 'full',
    description:
      'View mode: "full" includes sectionSnapshots and itemSnapshots; "summary" returns run-level fields only for lighter payloads',
  })
  @IsOptional()
  @IsIn(['full', 'summary'])
  view?: 'full' | 'summary' = 'full';
}
