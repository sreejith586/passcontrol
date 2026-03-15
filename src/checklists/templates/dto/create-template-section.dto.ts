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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChecklistItemSeverity } from '../../enums/checklist-item-severity.enum';

export class CreateTemplateItemDto {
  @ApiProperty({ example: 'BOOLEAN', description: 'Item type (e.g. BOOLEAN, TEXT, PHOTO)' })
  @IsString()
  itemType: string;

  @ApiProperty({ example: 'Refrigerator temperature checked' })
  @IsString()
  label: string;

  @ApiPropertyOptional({ example: 'Use thermometer in center of unit' })
  @IsOptional()
  @IsString()
  helpText?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  isRequired?: boolean = true;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  requiresEvidenceOnFail?: boolean = false;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  requiresCommentOnFail?: boolean = false;

  @ApiPropertyOptional({ enum: ChecklistItemSeverity, default: ChecklistItemSeverity.MEDIUM })
  @IsOptional()
  @IsEnum(ChecklistItemSeverity)
  severity?: ChecklistItemSeverity = ChecklistItemSeverity.MEDIUM;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  failureCreatesIncident?: boolean = false;

  @ApiPropertyOptional({ description: 'Type-specific config (e.g. options for CHOICE)' })
  @IsOptional()
  configJson?: Record<string, unknown>;

  @ApiProperty({ example: 0, minimum: 0 })
  @IsInt()
  @Min(0)
  sortOrder: number;
}

export class CreateTemplateSectionDto {
  @ApiProperty({ example: 'Temperature Checks' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'All refrigeration units' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 0, minimum: 0 })
  @IsInt()
  @Min(0)
  sortOrder: number;

  @ApiPropertyOptional({ type: [CreateTemplateItemDto], default: [] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTemplateItemDto)
  items?: CreateTemplateItemDto[] = [];
}
