import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListZonesQueryDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Filter by location' })
  @IsOptional()
  @IsUUID()
  locationId?: string;
}
