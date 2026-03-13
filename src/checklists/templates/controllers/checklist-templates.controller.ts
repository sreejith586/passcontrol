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
import { ChecklistTemplatesService } from '../services/checklist-templates.service';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import { ListTemplatesQueryDto } from '../dto/list-templates.dto';
import { JwtAuthGuard } from '../../../auth/guards/auth.guard';
import { RbacGuard } from '../../../access/rbac/rbac.guard';
import { RequirePermissions } from '../../../access/rbac/permissions.decorator';
import { ApiResponse } from '../../../infra/responses/api-response';
import {
  CurrentTenantContext,
  TenantContext,
} from '../../../access/decorators/current-tenant.decorator';

@Controller({ path: 'checklist-templates', version: '1' })
@UseGuards(JwtAuthGuard, RbacGuard)
export class ChecklistTemplatesController {
  constructor(private readonly service: ChecklistTemplatesService) {}

  @Post()
  @RequirePermissions('checklist.template.create')
  async create(
    @CurrentTenantContext() ctx: TenantContext,
    @Body() dto: CreateTemplateDto,
  ) {
    const template = await this.service.create(ctx, dto);
    return ApiResponse.created(template);
  }

  @Get()
  @RequirePermissions('checklist.template.view')
  async list(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: ListTemplatesQueryDto,
  ) {
    const list = await this.service.list(ctx, query);
    return ApiResponse.ok(list);
  }

  @Get(':id')
  @RequirePermissions('checklist.template.view')
  async get(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
  ) {
    const template = await this.service.getById(ctx, id);
    return ApiResponse.ok(template);
  }

  @Patch(':id')
  @RequirePermissions('checklist.template.update')
  async update(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    const template = await this.service.update(ctx, id, dto);
    return ApiResponse.ok(template);
  }

  @Post(':id/publish')
  @RequirePermissions('checklist.template.publish')
  async publish(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
  ) {
    const template = await this.service.publish(ctx, id);
    return ApiResponse.ok(template);
  }

  @Post(':id/archive')
  @RequirePermissions('checklist.template.archive')
  async archive(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
  ) {
    const template = await this.service.archive(ctx, id);
    return ApiResponse.ok(template);
  }
}
