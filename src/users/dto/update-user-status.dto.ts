import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserStatusDto {
  @ApiProperty({ description: 'Whether the user is active' })
  @IsBoolean()
  isActive!: boolean;
}
