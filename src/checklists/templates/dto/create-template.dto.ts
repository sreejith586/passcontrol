import {
  IsUUID,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateTemplateSectionDto } from './create-template-section.dto';

export class CreateTemplateDto {
  @ApiProperty({ example: 'opening-checklist' })
  @IsString()
  templateKey: string;

  @ApiProperty({ example: 'Opening Checklist' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Daily opening procedures' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @ApiPropertyOptional({ type: [CreateTemplateSectionDto], default: [] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTemplateSectionDto)
  sections?: CreateTemplateSectionDto[] = [];
}
