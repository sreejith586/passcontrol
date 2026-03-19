import { IsEmail, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InviteUserDto {
  @ApiProperty({ example: 'newuser@example.com', description: 'Email of the user to invite' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'uuid-of-role', description: 'Role UUID to assign (from GET /v1/roles)' })
  @IsUUID()
  roleId!: string;
}
