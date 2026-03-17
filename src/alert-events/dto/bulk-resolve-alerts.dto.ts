import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsUUID,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const MAX_BATCH_SIZE = 100;

export class BulkResolveAlertsDto {
  @ApiProperty({
    description: 'Alert event IDs to resolve',
    type: [String],
    example: ['uuid-1', 'uuid-2'],
    minItems: 1,
    maxItems: MAX_BATCH_SIZE,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'alertEventIds must be a non-empty array' })
  @ArrayMaxSize(MAX_BATCH_SIZE, { message: 'alertEventIds must not exceed 100 items' })
  @IsUUID('4', { each: true })
  alertEventIds!: string[];

  @ApiPropertyOptional({
    description: 'Optional resolution note applied to all resolved alerts',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolutionNote?: string;
}
