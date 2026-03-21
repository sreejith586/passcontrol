import { IsString, IsUUID, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateZoneDto {
  @ApiProperty({ format: 'uuid', description: 'Location this zone belongs to' })
  @IsUUID()
  locationId: string;

  @ApiProperty({ example: 'Prep', description: 'Zone name' })
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(255)
  name: string;
}
