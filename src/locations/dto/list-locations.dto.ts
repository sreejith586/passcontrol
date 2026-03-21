import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListLocationsQueryDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Filter by brand' })
  @IsOptional()
  @IsUUID()
  brandId?: string;
}
