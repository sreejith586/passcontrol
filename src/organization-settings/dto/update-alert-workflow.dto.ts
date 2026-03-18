import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAlertWorkflowDto {
  @ApiPropertyOptional({
    description:
      'When true, resolving an alert requires a non-empty resolution note',
  })
  @IsOptional()
  @IsBoolean()
  requireResolutionNoteOnResolve?: boolean;

  @ApiPropertyOptional({
    description:
      'When true, reopening an alert requires a non-empty note',
  })
  @IsOptional()
  @IsBoolean()
  requireReopenNoteOnReopen?: boolean;
}
