import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ChecklistItemSeverity } from '../../enums/checklist-item-severity.enum';

export class UpdateTemplateItemDto {
  @ApiPropertyOptional({ example: 'BOOLEAN' })
  @IsOptional()
  @IsString()
  itemType?: string;

  @ApiPropertyOptional({ example: 'Refrigerator temperature checked' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  helpText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  isRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  requiresEvidenceOnFail?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  requiresCommentOnFail?: boolean;

  @ApiPropertyOptional({ enum: ChecklistItemSeverity })
  @IsOptional()
  @IsEnum(ChecklistItemSeverity)
  severity?: ChecklistItemSeverity;

  @ApiPropertyOptional()
  @IsOptional()
  failureCreatesIncident?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  configJson?: Record<string, unknown>;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateTemplateSectionDto {
  @ApiPropertyOptional({ example: 'Temperature Checks' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ type: [UpdateTemplateItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateTemplateItemDto)
  items?: UpdateTemplateItemDto[] = [];
}
