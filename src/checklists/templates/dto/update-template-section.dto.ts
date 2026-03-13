import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTemplateItemDto {
  @IsOptional()
  @IsString()
  itemType?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  helpText?: string;

  @IsOptional()
  isRequired?: boolean;

  @IsOptional()
  requiresEvidenceOnFail?: boolean;

  @IsOptional()
  failureCreatesIncident?: boolean;

  @IsOptional()
  configJson?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateTemplateSectionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateTemplateItemDto)
  items?: UpdateTemplateItemDto[] = [];
}
