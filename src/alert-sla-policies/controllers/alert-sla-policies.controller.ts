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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { AlertSlaPoliciesService } from '../services/alert-sla-policies.service';
import { CreateAlertSlaPolicyDto } from '../dto/create-alert-sla-policy.dto';
import { UpdateAlertSlaPolicyDto } from '../dto/update-alert-sla-policy.dto';
import { ListAlertSlaPoliciesQueryDto } from '../dto/list-alert-sla-policies.dto';
import { PreviewAlertSlaPolicyQueryDto } from '../dto/preview-alert-sla-policy-query.dto';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { RbacGuard } from '../../access/rbac/rbac.guard';
import { RequirePermissions } from '../../access/rbac/permissions.decorator';
import { ApiResponse } from '../../infra/responses/api-response';
import {
  CurrentTenantContext,
  TenantContext,
} from '../../access/decorators/current-tenant.decorator';

@Controller({ path: 'alert-sla-policies', version: '1' })
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiTags('Alert SLA Policies')
@ApiBearerAuth()
export class AlertSlaPoliciesController {
  constructor(private readonly service: AlertSlaPoliciesService) {}

  @Get()
  @RequirePermissions('alert.sla-policy.view')
  @ApiOperation({ summary: 'List alert SLA policies (paginated)' })
  @ApiQuery({ name: 'brandId', required: false, description: 'Filter by brand UUID' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Filter by location UUID' })
  @ApiQuery({ name: 'severity', required: false, description: 'Filter by severity' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: ListAlertSlaPoliciesQueryDto,
  ) {
    const list = await this.service.list(ctx, query);
    return ApiResponse.ok(list);
  }

  @Get('preview')
  @RequirePermissions('alert.sla-policy.view')
  @ApiOperation({ summary: 'Preview which SLA policy would apply for given severity and scope' })
  @ApiQuery({ name: 'severity', required: true, description: 'Severity (e.g. CRITICAL, HIGH, MEDIUM, LOW)' })
  @ApiQuery({ name: 'brandId', required: false, description: 'Optional brand scope' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Optional location scope' })
  async preview(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: PreviewAlertSlaPolicyQueryDto,
  ) {
    const preview = await this.service.preview(ctx, query);
    return ApiResponse.ok(preview);
  }

  @Post()
  @RequirePermissions('alert.sla-policy.manage')
  @ApiOperation({ summary: 'Create alert SLA policy' })
  @ApiBody({ type: CreateAlertSlaPolicyDto })
  async create(
    @CurrentTenantContext() ctx: TenantContext,
    @Body() dto: CreateAlertSlaPolicyDto,
  ) {
    const policy = await this.service.create(ctx, dto);
    return ApiResponse.created(policy);
  }

  @Get(':id')
  @RequirePermissions('alert.sla-policy.view')
  @ApiOperation({ summary: 'Get alert SLA policy by ID' })
  @ApiParam({ name: 'id', description: 'Policy UUID' })
  async get(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
  ) {
    const policy = await this.service.getById(ctx, id);
    return ApiResponse.ok(policy);
  }

  @Patch(':id')
  @RequirePermissions('alert.sla-policy.manage')
  @ApiOperation({ summary: 'Update alert SLA policy' })
  @ApiParam({ name: 'id', description: 'Policy UUID' })
  @ApiBody({ type: UpdateAlertSlaPolicyDto })
  async update(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateAlertSlaPolicyDto,
  ) {
    const updated = await this.service.update(ctx, id, dto);
    return ApiResponse.ok(updated);
  }
}
