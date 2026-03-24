import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MinLength } from 'class-validator';

export class SelfOnboardingVerifyEmailDto {
  @ApiProperty({
    description: 'Plain verification token from the email link query parameter.',
    example: 'a1b2c3…',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1, { message: 'Token is required' })
  token!: string;
}
