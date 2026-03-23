import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateEmailSettingsDto {
  @ApiPropertyOptional({ example: 'smtp.example.com' })
  @IsOptional()
  @IsString()
  smtpHost?: string;

  @ApiPropertyOptional({ example: 587, minimum: 1, maximum: 65535 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  smtpPort?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  smtpUser?: string | null;

  @ApiPropertyOptional({ description: 'Set to update password; omit to keep existing' })
  @IsOptional()
  @IsString()
  smtpPassword?: string | null;

  @ApiPropertyOptional({ example: 'noreply@example.com' })
  @IsOptional()
  @IsEmail()
  fromEmail?: string;

  @ApiPropertyOptional({ example: 'PassControl' })
  @IsOptional()
  @IsString()
  fromName?: string | null;

  @ApiPropertyOptional({ description: 'PEM-encoded CA certificate for TLS (e.g. for internal/private mail relays)' })
  @IsOptional()
  @IsString()
  smtpCaCertPem?: string | null;
}
