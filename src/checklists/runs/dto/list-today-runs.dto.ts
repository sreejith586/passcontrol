import {
  IsUUID,
  IsOptional,
  IsIn,
  IsString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListTodayRunsQueryDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'] })
  @IsOptional()
  @IsIn(['PENDING', 'IN_PROGRESS', 'COMPLETED'])
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

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
}
