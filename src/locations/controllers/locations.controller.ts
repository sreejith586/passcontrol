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
import { LocationsService } from '../services/locations.service';
import { CreateLocationDto } from '../dto/create-location.dto';
import { UpdateLocationDto } from '../dto/update-location.dto';
import { ListLocationsQueryDto } from '../dto/list-locations.dto';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { RbacGuard } from '../../access/rbac/rbac.guard';
import { RequirePermissions } from '../../access/rbac/permissions.decorator';
import { ApiResponse } from '../../infra/responses/api-response';
import {
  CurrentTenantContext,
  TenantContext,
} from '../../access/decorators/current-tenant.decorator';

@Controller({ path: 'locations', version: '1' })
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiTags('Locations')
@ApiBearerAuth()
export class LocationsController {
  constructor(private readonly service: LocationsService) {}

  @Get()
  @RequirePermissions('location.view')
  @ApiOperation({ summary: 'List locations for organization' })
  @ApiQuery({ name: 'brandId', required: false, description: 'Filter by brand UUID' })
  async list(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: ListLocationsQueryDto,
  ) {
    const list = await this.service.list(ctx, query);
    return ApiResponse.ok(list);
  }

  @Post()
  @RequirePermissions('location.manage')
  @ApiOperation({ summary: 'Create location' })
  @ApiBody({ type: CreateLocationDto })
  async create(
    @CurrentTenantContext() ctx: TenantContext,
    @Body() dto: CreateLocationDto,
  ) {
    const location = await this.service.create(ctx, dto);
    return ApiResponse.created(location);
  }

  @Get(':id')
  @RequirePermissions('location.view')
  @ApiOperation({ summary: 'Get location by ID' })
  @ApiParam({ name: 'id', description: 'Location UUID' })
  async get(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
  ) {
    const location = await this.service.getById(ctx, id);
    return ApiResponse.ok(location);
  }

  @Patch(':id')
  @RequirePermissions('location.manage')
  @ApiOperation({ summary: 'Update location' })
  @ApiParam({ name: 'id', description: 'Location UUID' })
  @ApiBody({ type: UpdateLocationDto })
  async update(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    const updated = await this.service.update(ctx, id, dto);
    return ApiResponse.ok(updated);
  }
}
