import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignAlertDto {
  @ApiProperty({
    format: 'uuid',
    description: 'User ID to assign the alert to',
  })
  @IsUUID()
  assignedToUserId!: string;
}
