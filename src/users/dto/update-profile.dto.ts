import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phoneNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobTitle?: string | null;
}
