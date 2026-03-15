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
import { ChecklistRunsService } from '../services/checklist-runs.service';
import { ChecklistRunItemsService } from '../services/checklist-run-items.service';
import { UpdateRunItemDto } from '../dto/update-run-item.dto';
import { LinkAttachmentToRunItemDto } from '../dto/link-attachment-to-run-item.dto';
import { CreateTemperatureReadingForRunItemDto } from '../dto/create-temperature-reading-for-run-item.dto';
import { ListFailedChecklistRunItemsQueryDto } from '../dto/list-failed-checklist-run-items.dto';
import { JwtAuthGuard } from '../../../auth/guards/auth.guard';
import { RbacGuard } from '../../../access/rbac/rbac.guard';
import { RequirePermissions } from '../../../access/rbac/permissions.decorator';
import { ApiResponse } from '../../../infra/responses/api-response';
import {
  CurrentTenantContext,
  TenantContext,
} from '../../../access/decorators/current-tenant.decorator';

@Controller({ path: 'checklist-run-items', version: '1' })
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiTags('Checklist Run Items')
@ApiBearerAuth()
export class ChecklistRunItemsController {
  constructor(
    private readonly service: ChecklistRunsService,
    private readonly runItemsService: ChecklistRunItemsService,
  ) {}

  @Get('failed')
  @RequirePermissions('checklist.run.view')
  @ApiOperation({
    summary: 'List failed run item snapshots (paginated)',
    description:
      'Returns one row per failed ChecklistRunItemSnapshot. Sorted by severity (CRITICAL first), then effective run date desc.',
  })
  @ApiQuery({ name: 'brandId', required: false, description: 'Filter by brand UUID' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Filter by location UUID' })
  @ApiQuery({ name: 'zoneId', required: false, description: 'Filter by zone UUID' })
  @ApiQuery({ name: 'checklistTemplateId', required: false, description: 'Filter by checklist template UUID' })
  @ApiQuery({ name: 'severity', required: false, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  @ApiQuery({
    name: 'from',
    required: false,
    example: '2025-03-01',
    description: 'Filter from date (inclusive). Uses run dueAt when present, otherwise createdAt.',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    example: '2025-03-15',
    description: 'Filter to date (inclusive). Uses run dueAt when present, otherwise createdAt.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 25 })
  async getFailed(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: ListFailedChecklistRunItemsQueryDto,
  ) {
    const list = await this.runItemsService.getFailedItems(ctx, query);
    return ApiResponse.ok(list);
  }

  @Patch(':id')
  @RequirePermissions('checklist.run.update')
  @ApiOperation({ summary: 'Update run item response' })
  @ApiParam({ name: 'id', description: 'Run item snapshot UUID' })
  @ApiBody({ type: UpdateRunItemDto })
  async update(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateRunItemDto,
  ) {
    const item = await this.service.updateRunItem(ctx, id, dto);
    return ApiResponse.ok(item);
  }

  @Post(':id/attachments')
  @RequirePermissions('checklist.run.update')
  @ApiOperation({ summary: 'Link attachment as evidence to run item' })
  @ApiParam({ name: 'id', description: 'Run item snapshot UUID' })
  @ApiBody({ type: LinkAttachmentToRunItemDto })
  async linkAttachment(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: LinkAttachmentToRunItemDto,
  ) {
    const attachment = await this.service.linkAttachmentToRunItem(ctx, id, dto);
    return ApiResponse.ok(attachment);
  }

  @Post(':id/temperature-readings')
  @RequirePermissions('checklist.run.update')
  @ApiOperation({ summary: 'Create temperature reading for run item snapshot' })
  @ApiParam({ name: 'id', description: 'Run item snapshot UUID (ChecklistRunItemSnapshot.id)' })
  @ApiBody({ type: CreateTemperatureReadingForRunItemDto })
  async createTemperatureReading(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: CreateTemperatureReadingForRunItemDto,
  ) {
    const reading = await this.service.createTemperatureReadingForRunItem(ctx, id, dto);
    return ApiResponse.created(reading);
  }
}
