import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTemplateItemDto {
  @IsString()
  itemType: string;

  @IsString()
  label: string;

  @IsOptional()
  @IsString()
  helpText?: string;

  @IsOptional()
  isRequired?: boolean = true;

  @IsOptional()
  requiresEvidenceOnFail?: boolean = false;

  @IsOptional()
  failureCreatesIncident?: boolean = false;

  @IsOptional()
  configJson?: Record<string, unknown>;

  @IsInt()
  @Min(0)
  sortOrder: number;
}

export class CreateTemplateSectionDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(0)
  sortOrder: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTemplateItemDto)
  items?: CreateTemplateItemDto[] = [];
}
