import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { ZonesService } from '../services/zones.service';
import { CreateZoneDto } from '../dto/create-zone.dto';
import { UpdateZoneDto } from '../dto/update-zone.dto';
import { ListZonesQueryDto } from '../dto/list-zones.dto';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { RbacGuard } from '../../access/rbac/rbac.guard';
import { RequirePermissions } from '../../access/rbac/permissions.decorator';
import { ApiResponse } from '../../infra/responses/api-response';
import {
  CurrentTenantContext,
  TenantContext,
} from '../../access/decorators/current-tenant.decorator';

@Controller({ path: 'zones', version: '1' })
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiTags('Zones')
@ApiBearerAuth()
export class ZonesController {
  constructor(private readonly service: ZonesService) {}

  @Get()
  @RequirePermissions('zone.view')
  @ApiOperation({ summary: 'List zones for organization' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Filter by location UUID' })
  async list(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: ListZonesQueryDto,
  ) {
    const list = await this.service.list(ctx, query);
    return ApiResponse.ok(list);
  }

  @Post()
  @RequirePermissions('zone.manage')
  @ApiOperation({ summary: 'Create zone' })
  @ApiBody({ type: CreateZoneDto })
  async create(
    @CurrentTenantContext() ctx: TenantContext,
    @Body() dto: CreateZoneDto,
  ) {
    const zone = await this.service.create(ctx, dto);
    return ApiResponse.created(zone);
  }

  @Get(':id')
  @RequirePermissions('zone.view')
  @ApiOperation({ summary: 'Get zone by ID' })
  @ApiParam({ name: 'id', description: 'Zone UUID' })
  async get(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
  ) {
    const zone = await this.service.getById(ctx, id);
    return ApiResponse.ok(zone);
  }

  @Patch(':id')
  @RequirePermissions('zone.manage')
  @ApiOperation({ summary: 'Update zone' })
  @ApiParam({ name: 'id', description: 'Zone UUID' })
  @ApiBody({ type: UpdateZoneDto })
  async update(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateZoneDto,
  ) {
    const updated = await this.service.update(ctx, id, dto);
    return ApiResponse.ok(updated);
  }
}
