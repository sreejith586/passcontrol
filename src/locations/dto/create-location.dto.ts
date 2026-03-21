import { IsString, IsUUID, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLocationDto {
  @ApiProperty({ format: 'uuid', description: 'Brand this location belongs to' })
  @IsUUID()
  brandId: string;

  @ApiProperty({ example: 'Downtown Branch', description: 'Location name' })
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'America/New_York', description: 'IANA timezone' })
  @IsString()
  @MinLength(1, { message: 'Timezone is required' })
  @MaxLength(63)
  timezone: string;
}
