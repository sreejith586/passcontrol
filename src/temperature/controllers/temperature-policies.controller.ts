import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TemperaturePoliciesService } from '../services/temperature-policies.service';
import { CreateTemperaturePolicyDto } from '../dto/create-temperature-policy.dto';
import { UpdateTemperaturePolicyDto } from '../dto/update-temperature-policy.dto';
import { ListTemperaturePoliciesQueryDto } from '../dto/list-temperature-policies.dto';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { RbacGuard } from '../../access/rbac/rbac.guard';
import { RequirePermissions } from '../../access/rbac/permissions.decorator';
import { ApiResponse } from '../../infra/responses/api-response';
import {
  CurrentTenantContext,
  TenantContext,
} from '../../access/decorators/current-tenant.decorator';

@Controller({ path: 'temperature-policies', version: '1' })
@UseGuards(AuthGuard, RbacGuard)
export class TemperaturePoliciesController {
  constructor(private readonly service: TemperaturePoliciesService) {}

  @Post()
  @RequirePermissions('temperature.policy.create')
  async create(
    @CurrentTenantContext() ctx: TenantContext,
    @Body() dto: CreateTemperaturePolicyDto,
  ) {
    const policy = await this.service.create(ctx, dto);
    return ApiResponse.created(policy);
  }

  @Get()
  @RequirePermissions('temperature.policy.view')
  async list(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: ListTemperaturePoliciesQueryDto,
  ) {
    const list = await this.service.list(ctx, query);
    return ApiResponse.ok(list);
  }

  @Get(':id')
  @RequirePermissions('temperature.policy.view')
  async get(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
  ) {
    const policy = await this.service.getById(ctx, id);
    return ApiResponse.ok(policy);
  }

  @Patch(':id')
  @RequirePermissions('temperature.policy.update')
  async update(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateTemperaturePolicyDto,
  ) {
    const updated = await this.service.update(ctx, id, dto);
    return ApiResponse.ok(updated);
  }

  @Delete(':id')
  @RequirePermissions('temperature.policy.update')
  async deactivate(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
  ) {
    const result = await this.service.deactivate(ctx, id);
    return ApiResponse.ok(result);
  }
}
