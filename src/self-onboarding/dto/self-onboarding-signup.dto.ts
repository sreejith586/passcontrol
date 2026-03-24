import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { OrganizationTenantType } from '@prisma/client';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class SelfOnboardingSignupDto {
  @ApiProperty({ example: 'Alex Rivera' })
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1, { message: 'Full name is required' })
  @MaxLength(200)
  fullName!: string;

  @ApiProperty({ example: 'alex@company.com' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '+1 555 0100' })
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(50)
  phoneNumber?: string;

  @ApiProperty({ example: 'Rivera Kitchens LLC' })
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1, { message: 'Organization name is required' })
  @MaxLength(200)
  organizationName!: string;

  @ApiPropertyOptional({ example: 'Director of Operations' })
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(200)
  jobTitle?: string;

  @ApiProperty({ minLength: 8, description: 'Same minimum length as other password flows (8+).' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;

  @ApiProperty({ enum: OrganizationTenantType, description: 'Tenant offering for the new organization.' })
  @IsEnum(OrganizationTenantType, {
    message: 'signupMode must be DEMO or STANDARD',
  })
  signupMode!: OrganizationTenantType;

  @ApiPropertyOptional({
    description: 'Opaque label for analytics (e.g. marketing channel).',
    example: 'landing_v1',
  })
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(200)
  signupSource?: string;
}
