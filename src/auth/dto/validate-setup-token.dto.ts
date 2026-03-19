import { IsString, MinLength } from 'class-validator';

export class ValidateSetupTokenDto {
  @IsString()
  @MinLength(1, { message: 'Token is required' })
  token: string;
}
