import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRunItemDto {
  @ApiPropertyOptional({ example: 'PASS', description: 'Result (e.g. PASS, FAIL)' })
  @IsOptional()
  @IsString()
  result?: string;

  @ApiPropertyOptional({ description: 'Type-specific value (JSON object)' })
  @IsOptional()
  valueJson?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'Temperature was 38°F' })
  @IsOptional()
  @IsString()
  comment?: string;
}
