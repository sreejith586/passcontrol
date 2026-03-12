import { IsString, IsInt, Min, IsOptional } from 'class-validator';

export class RegisterFileDto {
  @IsString()
  storageProvider: string;

  @IsString()
  bucket: string;

  @IsString()
  objectKey: string;

  @IsString()
  fileName: string;

  @IsString()
  mimeType: string;

  @IsInt()
  @Min(0)
  sizeBytes: number;

  @IsOptional()
  @IsString()
  checksum?: string;
}
