import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBrandDto {
  @ApiProperty({ example: 'PassControl Kitchen', description: 'Brand name' })
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(255)
  name: string;
}
