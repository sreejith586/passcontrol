import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddRoleDto {
  @ApiProperty({ description: 'Role UUID to assign (from GET /v1/roles)' })
  @IsUUID()
  roleId!: string;
}
