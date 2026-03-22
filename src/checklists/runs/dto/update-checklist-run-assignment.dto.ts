import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateChecklistRunAssignmentDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'User ID to assign the run to; null to clear assignment',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  assignedToUserId?: string | null;
}
