import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class InitUploadDto {
  @IsString()
  fileName: string;

  @IsString()
  mimeType: string;

  @IsInt()
  @Min(1)
  @Max(50 * 1024 * 1024) // 50 MB max for MVP
  sizeBytes: number;

  @IsOptional()
  @IsString()
  checksum?: string;
}
