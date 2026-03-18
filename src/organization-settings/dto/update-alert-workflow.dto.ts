import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAlertWorkflowDto {
  @ApiProperty({
    description:
      'When true, resolving an alert requires a non-empty resolution note',
  })
  @IsBoolean()
  requireResolutionNoteOnResolve!: boolean;
}
