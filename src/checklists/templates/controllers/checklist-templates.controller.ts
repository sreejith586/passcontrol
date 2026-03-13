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
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
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
@ApiTags('Checklist Templates')
@ApiBearerAuth()
export class ChecklistTemplatesController {
  constructor(private readonly service: ChecklistTemplatesService) {}

  @Post()
  @RequirePermissions('checklist.template.create')
  @ApiOperation({ summary: 'Create a checklist template in DRAFT state' })
  @ApiBody({ type: CreateTemplateDto })
  async create(
    @CurrentTenantContext() ctx: TenantContext,
    @Body() dto: CreateTemplateDto,
  ) {
    const template = await this.service.create(ctx, dto);
    return ApiResponse.created(template);
  }

  @Get()
  @RequirePermissions('checklist.template.view')
  @ApiOperation({ summary: 'List checklist templates with filters' })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] })
  @ApiQuery({ name: 'brandId', required: false, description: 'Filter by brand UUID' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Filter by location UUID' })
  @ApiQuery({ name: 'zoneId', required: false, description: 'Filter by zone UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 25 })
  async list(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: ListTemplatesQueryDto,
  ) {
    const list = await this.service.list(ctx, query);
    return ApiResponse.ok(list);
  }

  @Get(':id')
  @RequirePermissions('checklist.template.view')
  @ApiOperation({ summary: 'Get template by ID with sections and items' })
  @ApiParam({ name: 'id', description: 'Template UUID' })
  async get(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
  ) {
    const template = await this.service.getById(ctx, id);
    return ApiResponse.ok(template);
  }

  @Patch(':id')
  @RequirePermissions('checklist.template.update')
  @ApiOperation({ summary: 'Update template (DRAFT only)' })
  @ApiParam({ name: 'id', description: 'Template UUID' })
  @ApiBody({ type: UpdateTemplateDto })
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
  @ApiOperation({ summary: 'Publish template (DRAFT → PUBLISHED)' })
  @ApiParam({ name: 'id', description: 'Template UUID' })
  async publish(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
  ) {
    const template = await this.service.publish(ctx, id);
    return ApiResponse.ok(template);
  }

  @Post(':id/archive')
  @RequirePermissions('checklist.template.archive')
  @ApiOperation({ summary: 'Archive template' })
  @ApiParam({ name: 'id', description: 'Template UUID' })
  async archive(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
  ) {
    const template = await this.service.archive(ctx, id);
    return ApiResponse.ok(template);
  }
}
