import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ResolveAlertDto {
  @ApiPropertyOptional({ description: 'Optional note explaining how the alert was resolved' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolutionNote?: string;
}
