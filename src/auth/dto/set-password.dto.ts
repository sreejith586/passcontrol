import { IsOptional, IsString, MinLength } from 'class-validator';

export class SetPasswordDto {
  @IsString()
  @MinLength(1, { message: 'Token is required' })
  token: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @IsOptional()
  @IsString()
  passwordConfirm?: string;
}
