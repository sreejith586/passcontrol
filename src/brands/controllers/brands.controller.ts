import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { BrandsService } from '../services/brands.service';
import { CreateBrandDto } from '../dto/create-brand.dto';
import { UpdateBrandDto } from '../dto/update-brand.dto';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { RbacGuard } from '../../access/rbac/rbac.guard';
import { RequirePermissions } from '../../access/rbac/permissions.decorator';
import { ApiResponse } from '../../infra/responses/api-response';
import {
  CurrentTenantContext,
  TenantContext,
} from '../../access/decorators/current-tenant.decorator';

@Controller({ path: 'brands', version: '1' })
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiTags('Brands')
@ApiBearerAuth()
export class BrandsController {
  constructor(private readonly service: BrandsService) {}

  @Get()
  @RequirePermissions('brand.view')
  @ApiOperation({ summary: 'List brands for organization' })
  async list(@CurrentTenantContext() ctx: TenantContext) {
    const list = await this.service.list(ctx);
    return ApiResponse.ok(list);
  }

  @Post()
  @RequirePermissions('brand.manage')
  @ApiOperation({ summary: 'Create brand' })
  @ApiBody({ type: CreateBrandDto })
  async create(
    @CurrentTenantContext() ctx: TenantContext,
    @Body() dto: CreateBrandDto,
  ) {
    const brand = await this.service.create(ctx, dto);
    return ApiResponse.created(brand);
  }

  @Get(':id')
  @RequirePermissions('brand.view')
  @ApiOperation({ summary: 'Get brand by ID' })
  @ApiParam({ name: 'id', description: 'Brand UUID' })
  async get(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
  ) {
    const brand = await this.service.getById(ctx, id);
    return ApiResponse.ok(brand);
  }

  @Patch(':id')
  @RequirePermissions('brand.manage')
  @ApiOperation({ summary: 'Update brand' })
  @ApiParam({ name: 'id', description: 'Brand UUID' })
  @ApiBody({ type: UpdateBrandDto })
  async update(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateBrandDto,
  ) {
    const updated = await this.service.update(ctx, id, dto);
    return ApiResponse.ok(updated);
  }
}
